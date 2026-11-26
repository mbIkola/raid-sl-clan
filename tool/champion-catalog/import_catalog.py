#!/usr/bin/env python3
"""Import public RAID reference data to local JSON and image files."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import closing
import hashlib
import json
from pathlib import Path
import sqlite3
import sys
import xml.etree.ElementTree as ET

from catalog import (HH, RSL, atomic_bytes, name_key, normalize_champions, now, mastery_selection_issues,
                     parse_masteries, read_json, rsl_assets, update_index, write_json)
from download import Downloader

DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "local/champion-catalog"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def progress(message):
    print(message, flush=True)


def select_champions(records, selector):
    if selector is None:
        return list(records.values())
    matches = [r for r in records.values() if selector == r["id"] or
               selector.casefold() == r["name"].casefold() or selector == r["slug"]]
    if len(matches) != 1:
        raise ValueError(f"Expected one champion for {selector!r}; found {len(matches)}")
    return matches


def run_jobs(items, function, workers, label):
    successes, errors = [], []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(function, item): item for item in items}
        for number, future in enumerate(as_completed(futures), 1):
            item = futures[future]
            try:
                successes.append(future.result())
            except Exception as error:
                key = item.get("id") if isinstance(item, dict) else str(item)
                errors.append({"item": key, "error": str(error)})
                progress(f"{label} ERROR {key}: {error}")
            if number % 50 == 0 or number == len(items):
                progress(f"{label}: {number}/{len(items)}, errors={len(errors)}")
    return successes, errors


def import_rsl(root, downloader, selector=None, workers=4, refresh_images=False):
    started = now()
    source_dir = root / "sources/rsl-x"
    version_data = downloader.get(f"{RSL}/tools/champions-index/db-version.json", refresh=True)
    version = str(json.loads(version_data)["version"])
    if not version.isdigit():
        raise ValueError("Unexpected RSL-X database version")
    database = downloader.get(f"{RSL}/tools/champions-index/champions.db?v={version}")
    pages_data = downloader.get(f"{RSL}/champions/pages.json", refresh=True)
    if not database.startswith(b"SQLite format 3\x00"):
        raise ValueError("RSL-X did not return SQLite")
    with closing(sqlite3.connect(":memory:")) as connection:
        connection.deserialize(database)
        if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("RSL-X SQLite integrity check failed")
        connection.row_factory = sqlite3.Row
        rows = [dict(row) for row in connection.execute("SELECT * FROM champions")]
        effects = [dict(row) for row in connection.execute("SELECT * FROM effects")]
    records = normalize_champions(rows, json.loads(pages_data)["champions"], started)
    selected = select_champions(records, selector)
    for filename, data in [("champions.db", database), ("pages.json", pages_data), ("db-version.json", version_data)]:
        atomic_bytes(source_dir / filename, data)
    write_json(source_dir / "snapshot.json", {"version": version, "sha256": hashlib.sha256(database).hexdigest(),
                                             "fetchedAt": started, "champions": len(records), "forms": len(rows)})
    write_json(root / "effects.json", {"schemaVersion": 1, "effects": effects})
    progress(f"RSL-X snapshot {version}: {len(records)} champions, {len(rows)} forms; importing {len(selected)}")

    def save(record):
        for relative, url in rsl_assets(record):
            downloader.image(url, root / relative, refresh=refresh_images)
        record["source"]["databaseVersion"] = version
        write_json(root / f"champions/{record['id']}.json", record)
        return record

    successes, errors = run_jobs(selected, save, workers, "RSL-X")
    update_index(root, successes, started, full=selector is None and not errors)
    report = {"source": "rsl-x", "startedAt": started, "finishedAt": now(), "selector": selector,
              "databaseVersion": version, "sourceChampions": len(records), "sourceForms": len(rows),
              "requested": len(selected), "imported": len(successes), "errors": errors}
    write_json(root / "reports/rsl-x.json", report)
    return report


def hh_pages(downloader):
    index = ET.fromstring(downloader.get(f"{HH}/sitemap_index.xml", refresh=True))
    maps = [node.text for node in index.findall("s:sitemap/s:loc", NS)
            if "/champions-sitemap" in node.text]
    if not maps:
        raise ValueError("No HellHades champion sitemaps discovered")
    pages = {}
    for url in maps:
        document = ET.fromstring(downloader.get(url, refresh=True))
        for loc in document.findall("s:url/s:loc", NS):
            if "/raid/champions/" in loc.text:
                slug = loc.text.rstrip("/").rsplit("/", 1)[-1]
                key = name_key(slug)
                if key in pages and pages[key] != loc.text:
                    raise ValueError(f"Ambiguous HellHades slug: {slug}")
                pages[key] = loc.text
    return pages


def import_hh(root, downloader, selector=None, workers=3, refresh=False, overrides=None):
    started = now()
    index = read_json(root / "index.json")
    if not index:
        raise ValueError("Import RSL-X before HellHades")
    records = {r["id"]: r for r in index["champions"]}
    selected = select_champions(records, selector)
    pages = hh_pages(downloader)
    overrides = overrides or {}
    dictionary = read_json(root / "masteries.json", {"schemaVersion": 1, "masteries": {}})
    unmatched, no_recommendations = [], []

    def fetch(record):
        url = overrides.get(record["id"]) or pages.get(name_key(record["name"])) or pages.get(name_key(record["slug"] or ""))
        if not url:
            return record["id"], None
        html = downloader.get(url, refresh=refresh).decode("utf-8")
        result = parse_masteries(html, url, record["name"])
        previous = read_json(root / f"builds/{record['id']}.json", {"builds": []})
        invalid_ids = {b["id"] for b in result.get("unvalidatedBuilds", [])}
        for old in previous["builds"]:
            if old["id"] in invalid_ids and not mastery_selection_issues(old["masteries"], result["masteries"]):
                result["builds"].append({**old, "preservedFrom": old.get("preservedFrom", previous.get("source", {}))})
                result["status"] = "partial"
        if previous["builds"] and not result["builds"] and not invalid_ids:
            raise ValueError("Previously populated mastery builds disappeared; preserving previous file")
        result["championId"], result["source"]["fetchedAt"] = record["id"], started
        return record["id"], result

    results, errors = run_jobs(selected, fetch, workers, "HellHades pages")
    assets = {}
    for hero_id, result in results:
        if result is None:
            unmatched.append({"id": hero_id, "name": records[hero_id]["name"]})
            continue
        if not result["builds"] and not result.get("unvalidatedBuilds"):
            no_recommendations.append({"id": hero_id, "name": records[hero_id]["name"]})
        for key, mastery in result["masteries"].items():
            dictionary["masteries"][key] = mastery
            if mastery["sourceImage"]:
                assets[mastery["icon"]] = mastery["sourceImage"]

    def image(item):
        relative, url = item
        downloader.image(url, root / relative)
        return relative

    _, image_errors = run_jobs(list(assets.items()), image, workers, "HellHades icons")
    if not image_errors:
        dictionary["updatedAt"] = started
        write_json(root / "masteries.json", dictionary)
        for hero_id, result in results:
            if result is not None:
                write_json(root / f"builds/{hero_id}.json", {k: v for k, v in result.items() if k != "masteries"})
    report = {"source": "hellhades", "startedAt": started, "finishedAt": now(), "selector": selector,
              "requested": len(selected), "pagesDiscovered": len(pages),
              "imported": 0 if image_errors else sum(result is not None for _, result in results),
              "withBuilds": sum(bool(result and result["builds"]) for _, result in results),
              "sourceIssues": [{"id": hero_id, "name": records[hero_id]["name"], "buildId": build["id"],
                                "label": build["label"], "issues": build["issues"]}
                               for hero_id, result in results if result
                               for build in result.get("unvalidatedBuilds", [])],
              "noRecommendations": no_recommendations, "unmatched": unmatched,
              "errors": errors + image_errors}
    write_json(root / "reports/hellhades.json", report)
    return report


def verify(root):
    index = read_json(root / "index.json")
    if not index or not index["champions"]:
        raise ValueError("Missing or empty catalogue index")
    errors, assets, forms, unvalidated_count = [], set(), 0, 0
    dictionary = read_json(root / "masteries.json", {"masteries": {}})["masteries"]
    for entry in index["champions"]:
        record = read_json(root / entry["path"])
        if not record or record["id"] != entry["id"]:
            errors.append(f"Missing/mismatched champion: {entry['id']}")
            continue
        assets.add(record["portrait"])
        forms += len(record["forms"])
        for form in record["forms"]:
            assets.update(skill["icon"] for skill in form["skills"])
        builds = read_json(root / f"builds/{entry['id']}.json", {"builds": []})
        unvalidated_count += len(builds.get("unvalidatedBuilds", []))
        for build in builds["builds"]:
            for issue in mastery_selection_issues(build["masteries"], dictionary):
                errors.append(f"{entry['id']} {build['id']}: {issue}")
        for build in builds.get("unvalidatedBuilds", []):
            for key in build["masteries"]:
                if key not in dictionary:
                    errors.append(f"Unknown mastery in unvalidated source build: {key}")
    assets.update(m["icon"] for m in dictionary.values() if m.get("icon"))
    from download import validate_image
    for relative in sorted(assets):
        try:
            validate_image((root / relative).read_bytes())
        except (OSError, ValueError) as error:
            errors.append(f"{relative}: {error}")
    report = {"verifiedAt": now(), "champions": len(index["champions"]), "forms": forms,
              "images": len(assets), "masteries": len(dictionary), "unvalidatedBuilds": unvalidated_count, "errors": errors}
    write_json(root / "reports/verification.json", report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", choices=["rsl-x", "hellhades", "all", "verify"])
    parser.add_argument("--champion", help="Game ID, exact English name, or RSL-X slug; includes all forms")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--delay", type=float, default=0.15, help="Minimum interval between requests per host")
    parser.add_argument("--refresh", action="store_true", help="Refetch HellHades HTML instead of using cached pages")
    parser.add_argument("--refresh-images", action="store_true", help="Refetch existing RSL-X images")
    args = parser.parse_args()
    if not 1 <= args.workers <= 8 or args.delay < 0:
        parser.error("workers must be 1..8 and delay nonnegative")
    root = args.output.resolve()
    root.mkdir(parents=True, exist_ok=True)
    downloader = Downloader(root / ".cache/http", delay=args.delay)
    reports = []
    if args.source in ("rsl-x", "all"):
        reports.append(import_rsl(root, downloader, args.champion, args.workers, args.refresh_images))
    if args.source in ("hellhades", "all"):
        overrides = read_json(Path(__file__).with_name("source-overrides.json"), {})
        reports.append(import_hh(root, downloader, args.champion, min(args.workers, 3), args.refresh, overrides))
    if args.source in ("verify", "all"):
        reports.append(verify(root))
    for report in reports:
        progress(json.dumps(report, ensure_ascii=False))
    return 1 if any(report.get("errors") for report in reports) else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, sqlite3.Error, ET.ParseError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        sys.exit(1)
