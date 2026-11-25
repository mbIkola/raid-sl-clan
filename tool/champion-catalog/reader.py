"""Read-only adapter from import storage to the public CLI contract."""

import json
from pathlib import Path
import re
import unicodedata

from catalog import mastery_selection_issues

SCHEMA_VERSION = 1
DEFAULT_CATALOG = Path(__file__).resolve().parents[2] / "local/champion-catalog"


class QueryError(Exception):
    def __init__(self, code, message, details=None, exit_code=5):
        super().__init__(message)
        self.code, self.details, self.exit_code = code, details or {}, exit_code


def normalized(value):
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def load_json(path, code="INVALID_CATALOG", version_key="schemaVersion"):
    try:
        result = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise QueryError(code, f"Cannot read JSON: {path}", {"reason": str(error)}) from error
    if not isinstance(result, dict) or type(result.get(version_key)) is not int or result[version_key] != 1:
        raise QueryError(code, f"Unsupported or missing {version_key} in {path}")
    return result


def source_contract(source):
    if not isinstance(source, dict) or any(source.get(key) is not None and not isinstance(source[key], str)
                                           for key in ("provider", "url", "fetchedAt")):
        raise QueryError("INVALID_CATALOG", "Invalid source attribution")
    return {"provider": source.get("provider"), "url": source.get("url"),
            "fetched_at": source.get("fetchedAt")}


def validate_builds(builds, checked):
    if not isinstance(builds, list):
        raise QueryError("INVALID_CATALOG", "Mastery builds must be a list")
    seen = set()
    for build in builds:
        if (not isinstance(build, dict) or not isinstance(build.get("id"), str) or not build["id"]
                or build.get("mode") not in ("pve", "pvp") or not isinstance(build.get("label"), str)
                or not isinstance(build.get("masteries"), list)
                or any(not isinstance(key, str) or not key for key in build["masteries"])):
            raise QueryError("INVALID_CATALOG", "Malformed mastery build")
        if build["id"] in seen:
            raise QueryError("INVALID_CATALOG", "Duplicate mastery build identity")
        seen.add(build["id"])
        if not checked and (not isinstance(build.get("issues"), list) or not build["issues"]
                            or any(not isinstance(issue, str) for issue in build["issues"])):
            raise QueryError("INVALID_CATALOG", "Unvalidated source build must describe its issues")


def validate_definitions(definitions):
    if not isinstance(definitions, dict):
        raise QueryError("INVALID_CATALOG", "Mastery definitions must be an object")
    for key, definition in definitions.items():
        if (not isinstance(definition, dict) or definition.get("id") != key
                or not isinstance(definition.get("name"), str) or not isinstance(definition.get("description"), str)
                or definition.get("tree") not in ("offense", "defense", "support")
                or type(definition.get("tier")) is not int or not 1 <= definition["tier"] <= 6
                or (definition.get("icon") is not None and not isinstance(definition["icon"], str))):
            raise QueryError("INVALID_CATALOG", f"Malformed mastery definition: {key}")


class CatalogReader:
    def __init__(self, root=DEFAULT_CATALOG, metadata=None):
        self.root = Path(root).resolve()
        index = load_json(self.root / "index.json")
        if not isinstance(index.get("champions"), list) or any(not isinstance(entry, dict) for entry in index["champions"]):
            raise QueryError("INVALID_CATALOG", "champions must be a list of index entries")
        self.entries = {}
        for entry in index.get("champions", []):
            key = entry.get("id")
            if not isinstance(key, str) or not re.fullmatch(r"\d+", key) or key in self.entries:
                raise QueryError("INVALID_CATALOG", "Invalid or duplicate champion identity")
            if not isinstance(entry.get("name"), str) or not entry["name"].strip():
                raise QueryError("INVALID_CATALOG", f"Missing canonical name: {key}")
            self.entries[key] = entry
        if not self.entries:
            raise QueryError("INVALID_CATALOG", "Catalogue index has no champions")
        metadata_path = Path(metadata).resolve() if metadata is not None else self.root / "metadata.json"
        self.metadata = {}
        if metadata is not None or metadata_path.exists():
            document = load_json(metadata_path, "INVALID_METADATA", "schema_version")
            self.metadata = document.get("characters", {})
            if not isinstance(self.metadata, dict):
                raise QueryError("INVALID_METADATA", "characters must be an object keyed by character_id")
            allowed_ids = {f"raid:{identifier}" for identifier in self.entries}
            for key, overlay in self.metadata.items():
                if key not in allowed_ids or not isinstance(overlay, dict):
                    raise QueryError("INVALID_METADATA", f"Unknown character_id or invalid overlay: {key}")
                names, aliases, images = overlay.get("names", {}), overlay.get("aliases", []), overlay.get("images", {})
                if not isinstance(names, dict) or any(not isinstance(k, str) or not re.fullmatch(r"[a-z]{2,3}(?:-[A-Za-z0-9]+)*", k)
                                                      or not isinstance(v, str) or not v.strip() for k, v in names.items()):
                    raise QueryError("INVALID_METADATA", f"Invalid localized names: {key}")
                if "en" in names and names["en"] != self.entries[key.split(":")[1]]["name"]:
                    raise QueryError("INVALID_METADATA", "names.en must equal the source canonical name")
                if not isinstance(aliases, list) or any(not isinstance(a, str) or not a.strip() for a in aliases):
                    raise QueryError("INVALID_METADATA", f"Invalid aliases: {key}")
                if not isinstance(images, dict) or any(not isinstance(k, str) or not re.fullmatch(r"[a-z][a-z0-9_]*", k)
                                                       or not isinstance(v, str) or not v for k, v in images.items()):
                    raise QueryError("INVALID_METADATA", f"Invalid purpose-tagged images: {key}")

    def _path(self, relative):
        if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
            raise QueryError("INVALID_CATALOG", "Storage paths must be relative to the catalogue root")
        path = (self.root / relative).resolve()
        if not path.is_relative_to(self.root):
            raise QueryError("INVALID_CATALOG", "Storage path escapes the catalogue root")
        return path

    def _uri(self, relative):
        path = self._path(relative)
        if not path.is_file():
            raise QueryError("INVALID_CATALOG", "Referenced image is missing", {"path": str(path)})
        return path.as_uri()

    def _names(self, entry):
        overlay = self.metadata.get(f"raid:{entry['id']}", {})
        return {"en": entry["name"], **overlay.get("names", {})}, overlay.get("aliases", [])

    def _terms(self, entry):
        names, aliases = self._names(entry)
        return [entry["id"], f"raid:{entry['id']}", entry.get("slug") or "", *names.values(), *aliases]

    def _character(self, entry):
        record = load_json(self._path(entry.get("path")))
        if record.get("id") != entry["id"] or record.get("name") != entry["name"]:
            raise QueryError("INVALID_CATALOG", f"Index/record identity mismatch: {entry['id']}")
        names, aliases = self._names(entry)
        image_paths = {"portrait": record["portrait"],
                       **self.metadata.get(f"raid:{entry['id']}", {}).get("images", {})}
        return {"character_id": f"raid:{entry['id']}", "canonical_name": entry["name"],
                "names": names, "aliases": list(dict.fromkeys(a.strip() for a in aliases)),
                "images": {purpose: self._uri(path) for purpose, path in image_paths.items()}}

    def _resolve(self, selector):
        if not isinstance(selector, str) or not normalized(selector):
            raise QueryError("INVALID_ARGUMENTS", "Character selector must not be empty", exit_code=2)
        query = normalized(selector)
        raw_id = query.removeprefix("raid:")
        if raw_id in self.entries:
            return self.entries[raw_id]
        matches = [entry for entry in self.entries.values() if query in {normalized(term) for term in self._terms(entry)}]
        if not matches:
            raise QueryError("CHARACTER_NOT_FOUND", f"No exact character match for {selector!r}",
                             {"query": selector, "hint": "Use search_characters to find candidates."}, 3)
        if len(matches) > 1:
            candidates = [{"character_id": f"raid:{e['id']}", "canonical_name": e["name"]}
                          for e in sorted(matches, key=lambda e: (e["name"].casefold(), e["id"]))]
            raise QueryError("AMBIGUOUS_CHARACTER", "Multiple characters match; select a character_id", {"candidates": candidates}, 4)
        return matches[0]

    def get_character(self, selector):
        return self._character(self._resolve(selector))

    def search_characters(self, query="", limit=20, offset=0):
        if type(limit) is not int or not 1 <= limit <= 100 or type(offset) is not int or offset < 0:
            raise QueryError("INVALID_ARGUMENTS", "limit must be 1..100 and offset nonnegative", exit_code=2)
        term = normalized(query)
        matches = [entry for entry in self.entries.values() if any(term in normalized(value) for value in self._terms(entry))]
        matches.sort(key=lambda e: (e["name"].casefold(), e["id"]))
        return {"items": [self._character(entry) for entry in matches[offset:offset + limit]],
                "total": len(matches), "limit": limit, "offset": offset}

    def get_masteries(self, selector, mode="all", include_unvalidated=False):
        if mode not in ("all", "pve", "pvp"):
            raise QueryError("INVALID_ARGUMENTS", "mode must be all, pve or pvp", exit_code=2)
        entry = self._resolve(selector)
        character = self._character(entry)
        path = self._path(f"builds/{entry['id']}.json")
        if not path.exists():
            raise QueryError("MASTERIES_NOT_IMPORTED", "Character exists, but mastery recommendations have not been imported",
                             {"character_id": character["character_id"]}, 3)
        document = load_json(path)
        if document.get("championId") != entry["id"]:
            raise QueryError("INVALID_CATALOG", "Mastery document belongs to another character")
        validate_builds(document.get("builds"), True)
        validate_builds(document.get("unvalidatedBuilds", []), False)
        valid = [b for b in document["builds"] if mode == "all" or b["mode"] == mode]
        invalid = [b for b in document.get("unvalidatedBuilds", []) if mode == "all" or b["mode"] == mode]
        definitions = load_json(self.root / "masteries.json")["masteries"] if valid or invalid else {}
        validate_definitions(definitions)
        for build in valid:
            issues = mastery_selection_issues(build["masteries"], definitions)
            if issues:
                raise QueryError("INVALID_CATALOG", "Validated build fails validation", {"build_id": build["id"], "issues": issues})

        def build_contract(build, checked):
            result = {"build_id": build["id"], "mode": build["mode"], "label": build["label"],
                      "validation": "validated" if checked else "unvalidated", "mastery_ids": build["masteries"]}
            if not checked:
                result["issues"] = build["issues"]
            if build.get("preservedFrom"):
                result["preserved_from"] = source_contract(build["preservedFrom"])
            return result

        selected = valid + (invalid if include_unvalidated else [])
        keys = sorted({key for build in selected for key in build["masteries"]})
        masteries = {}
        for key in keys:
            if key not in definitions:
                raise QueryError("INVALID_CATALOG", f"Missing mastery definition: {key}")
            definition = definitions[key]
            masteries[key] = {"mastery_id": key, "name": definition["name"], "description": definition["description"],
                              "tree": definition["tree"], "tier": definition["tier"],
                              "images": {"icon": self._uri(definition["icon"])} if definition.get("icon") else {}}
        status = ("partial" if valid else "unvalidated") if invalid else ("available" if valid else "no_recommendations")
        return {"character": character, "status": status, "source": source_contract(document.get("source", {})),
                "builds": [build_contract(build, True) for build in valid], "masteries": masteries,
                "unvalidated_builds": [build_contract(build, False) for build in invalid] if include_unvalidated else [],
                "unvalidated_build_count": len(invalid),
                "warnings": [{"code": "UNVALIDATED_SOURCE_BUILDS", "count": len(invalid),
                              "message": "Source selections failed validation; they are excluded from builds.",
                              "build_ids": [b["id"] for b in invalid]}] if invalid else []}
