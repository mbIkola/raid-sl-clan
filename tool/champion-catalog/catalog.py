"""Source normalization and atomic local catalogue writes (no network)."""

from collections import defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import tempfile
import unicodedata
from urllib.parse import quote

RSL = "https://rsl-x.gg"
HH = "https://hellhades.com"
STAT_KEYS = ("hp", "atk", "def", "spd", "crate", "cdmg", "res", "acc")
SKILL_KEYS = ("s1", "s2", "s3", "s4", "p1", "p2")


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def atomic_bytes(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".download-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def write_json(path, data):
    atomic_bytes(path, (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode())


def read_json(path, default=None):
    return json.loads(Path(path).read_text()) if Path(path).exists() else default


def name_key(text):
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", ascii_text.lower())


def parse_skill(raw, slot, form_id, ordinal):
    lines = raw.strip().splitlines()
    cooldown = re.search(r"(?:⟳|Cooldown\s*:?)\s*(\d+)\s*(?:Turns?)?", raw, re.I)
    upgrades = [{"level": int(m[1]), "description": m[2].strip()}
                for m in re.finditer(r"^Level\s+(\d+):\s*(.+)$", raw, re.M)]
    multipliers = [line.strip() for line in lines[1:] if re.match(r".*Multiplier\s*:", line, re.I)]
    description = []
    for line in lines[1:]:
        if re.match(r"\s*Level\s+\d+:|.*Multiplier\s*:", line, re.I):
            continue
        if re.match(r"\s*⟳", line):
            continue
        description.append(line)
    return {"id": f"{form_id}:{slot}", "slot": slot, "name": lines[0].strip(),
            "kind": "passive" if slot.startswith("p") or re.search(r"\[(?:P|Passive)\]", lines[0], re.I) else "active",
            "description": "\n".join(description).strip(),
            "cooldown": int(cooldown[1]) if cooldown else None,
            "upgrades": upgrades, "multipliers": multipliers, "rawText": raw,
            "icon": f"images/skills/{form_id}_s{ordinal}.webp"}


def normalize_champions(rows, pages, fetched_at):
    result, seen = {}, set()
    for row in rows:
        form_id = str(row.get("IGid") or "")
        if not re.fullmatch(r"\d+(?:_f\d+)?", form_id) or form_id in seen:
            raise ValueError(f"Invalid or repeated IGid: {form_id!r}")
        seen.add(form_id)
        hero_id = form_id.split("_f")[0]
        slug = pages.get(row["name"])
        record = result.setdefault(hero_id, {
            "schemaVersion": 1, "id": hero_id, "name": row["name"], "slug": slug,
            "faction": row["faction"], "rarity": row["rarity"], "affinity": row["affinity"],
            "role": row["type"], "summonable": bool(row.get("invocable")),
            "portrait": f"images/champions/{hero_id}.webp", "forms": [],
            "source": {"provider": "rsl-x", "url": f"{RSL}/champions/{slug}/" if slug else None,
                       "fetchedAt": fetched_at, "imageName": row["image"]}})
        if record["name"] != row["name"]:
            raise ValueError(f"Conflicting names for {hero_id}")
        skills = [parse_skill(row[key], key, form_id, ordinal)
                  for ordinal, key in enumerate([key for key in SKILL_KEYS if row.get(key)], 1)]
        if not skills:
            raise ValueError(f"No skill data: {form_id}")
        record["forms"].append({"id": form_id, "stats": {key: row.get(key) for key in STAT_KEYS},
                                "aura": {"stat": row.get("aura"), "description": row.get("auratext")},
                                "effects": [x.strip() for x in (row.get("effects") or "").splitlines() if x.strip()],
                                "skills": skills})
    for record in result.values():
        record["forms"].sort(key=lambda f: f["id"])
    return result


def rsl_assets(record):
    yield record["portrait"], f"{RSL}/tools/champions-index/img/champions/{quote(record['source']['imageName'], safe='')}.webp"
    for form in record["forms"]:
        for skill in form["skills"]:
            yield skill["icon"], f"{RSL}/tools/champions-index/img/skills/{Path(skill['icon']).name}"


def update_index(root, records, fetched_at, full=False):
    path = root / "index.json"
    previous = read_json(path, {"champions": []})
    entries = {} if full else {r["id"]: r for r in previous["champions"]}
    for record in records:
        entries[record["id"]] = {key: record[key] for key in
                                  ("id", "name", "slug", "faction", "rarity", "affinity", "role", "portrait")}
        entries[record["id"]]["path"] = f"champions/{record['id']}.json"
    write_json(path, {"schemaVersion": 1, "updatedAt": fetched_at,
                      "champions": sorted(entries.values(), key=lambda r: (r["name"].casefold(), r["id"]))})


class MasteryParser(HTMLParser):
    """Read semantic mastery classes; layout geometry is deliberately irrelevant."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.divs, self.labels, self.builds, self.masteries = [], {}, {}, {}
        self.rows = defaultdict(int)
        self.nodes = defaultdict(set)
        self.heading, self.in_heading = "", False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "h1":
            self.in_heading = True
        if tag == "div":
            self.divs.append(attrs)
            group, tree = self.context()
            if group:
                self.builds.setdefault(group, [])
            if group and tree and "msb-mastery-row" in attrs.get("class", "").split():
                self.rows[group, tree] += 1
        if tag != "img" or not self.divs:
            return
        classes = self.divs[-1].get("class", "").split()
        if "msb-mastery-image" not in classes:
            return
        group, tree = self.context()
        key, title = attrs.get("alt", "").strip(), attrs.get("title", "")
        if not group or not tree or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", key):
            raise ValueError("Mastery node missing build, tree or identifier")
        name, _, description = title.partition(" - ")
        image = attrs.get("data-orig-src") or attrs.get("data-src") or attrs.get("src")
        if image and image.startswith("data:"):
            image = None
        self.masteries[key] = {"id": key, "name": name or key, "description": description,
                               "tree": tree, "tier": self.rows[group, tree], "sourceImage": image,
                               "icon": f"images/masteries/{key}.png" if image else None}
        self.nodes[group].add(key)
        if "rslm-disabled" not in classes:
            self.builds[group].append(key)

    def context(self):
        group = next((a["id"] for a in self.divs if re.fullmatch(r"pv[ep]-\d+", a.get("id", ""))), None)
        tree = next((t for a in reversed(self.divs) for t in ("offense", "defense", "support")
                     if f"msb-{t}" in a.get("class", "").split()), None)
        return group, tree

    def handle_endtag(self, tag):
        if tag == "div" and self.divs:
            self.divs.pop()
        if tag == "h1":
            self.in_heading = False

    def handle_data(self, data):
        if self.in_heading:
            self.heading += data
        if self.divs and "msb-accordion" in self.divs[-1].get("class", "").split():
            tab = self.divs[-1].get("data-tab")
            if tab:
                self.labels[tab] = self.labels.get(tab, "") + data


def mastery_selection_issues(selected, definitions):
    issues = []
    if len(selected) != 15 or len(selected) != len(set(selected)):
        issues.append(f"Expected 15 distinct mastery selections; found {len(selected)}")
    if any(node not in definitions for node in selected):
        return issues + ["Unknown mastery identifier"]
    if len({definitions[node]["tree"] for node in selected}) > 2 or sum(definitions[node]["tier"] == 6 for node in selected) != 1:
        issues.append("Invalid mastery branches or tier-six selections")
    return issues


def parse_masteries(html, url, expected_name):
    parser = MasteryParser()
    parser.feed(html)
    if name_key(parser.heading) != name_key(expected_name):
        raise ValueError(f"Champion mismatch: expected {expected_name!r}, received {parser.heading!r}")
    builds, unvalidated = [], []
    for key, selected in parser.builds.items():
        # HellHades explicitly uses mode-0 for "no recommendations for this mode".
        if key.endswith("-0") and not selected and not parser.nodes[key]:
            continue
        # Some templates include an unused, unlabelled extra grid (e.g. Androc pve-3).
        if key not in parser.labels and not selected:
            continue
        if len(parser.nodes[key]) != 66 or any(parser.rows[key, tree] != 6 for tree in ("offense", "defense", "support")):
            raise ValueError(f"Incomplete mastery grid in {key}")
        issues = mastery_selection_issues(selected, parser.masteries)
        build = {"id": key, "mode": "pve" if key.startswith("pve") else "pvp",
                 "label": parser.labels.get(key, key).strip(), "masteries": selected}
        if issues:
            unvalidated.append({**build, "issues": issues})
        else:
            builds.append(build)
    status = ("partial" if builds else "unvalidated") if unvalidated else ("available" if builds else "no_recommendations")
    return {"schemaVersion": 1, "status": status,
            "source": {"provider": "hellhades", "url": url},
            "builds": builds, "unvalidatedBuilds": unvalidated, "masteries": parser.masteries}
