import hashlib
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from catalog import normalize_champions, parse_masteries, update_index, write_json
from test_catalog import champion, mastery_html
from reader import CatalogReader, QueryError

CLI = Path(__file__).resolve().parents[1] / "raid-catalog"


def seed(root):
    rows = [champion(), champion(IGid="1030", name="Alure", image="Alure")]
    records = normalize_champions(rows, {"Ronda": "ronda", "Alure": "alure"}, "now")
    for record in records.values():
        write_json(root / f"champions/{record['id']}.json", record)
        image = root / record["portrait"]
        image.parent.mkdir(parents=True, exist_ok=True)
        image.write_bytes(b"RIFF\x04\0\0\0WEBPfixture")
    update_index(root, list(records.values()), "now", full=True)
    masteries = parse_masteries(mastery_html(), "https://hellhades.com/raid/champions/ronda/", "Ronda")
    definitions = masteries.pop("masteries")
    for mastery in definitions.values():
        path = root / mastery["icon"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"\x89PNG\r\n\x1a\nfixture")
    write_json(root / "masteries.json", {"schemaVersion": 1, "masteries": definitions})
    write_json(root / "builds/7360.json", {**masteries, "championId": "7360"})


class ReaderTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="raid catalogue ")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name).resolve()
        seed(self.root)

    def metadata(self, characters):
        write_json(self.root / "metadata.json", {"schema_version": 1, "characters": characters})

    def test_minimum_character_contract_has_stable_id_and_real_absolute_uri(self):
        record = CatalogReader(self.root).get_character("ronda")
        self.assertEqual(record["character_id"], "raid:7360")
        self.assertEqual(record["canonical_name"], "Ronda")
        self.assertEqual(record["names"], {"en": "Ronda"})
        self.assertEqual(record["aliases"], [])
        self.assertEqual(record["images"], {"portrait": (self.root / "images/champions/7360.webp").as_uri()})
        self.assertIn("%20", record["images"]["portrait"])

    def test_localized_names_and_aliases_resolve_without_losing_cyrillic(self):
        self.metadata({"raid:1030": {"names": {"ru": "Аллюра"}, "aliases": ["алюра"]}})
        reader = CatalogReader(self.root)
        for selector in ["  АЛЮРА  ", "Аллюра", "Alure", "1030", "raid:1030"]:
            self.assertEqual(reader.get_character(selector)["character_id"], "raid:1030")
        self.assertEqual(reader.search_characters("алю")["total"], 1)

    def test_identity_survives_name_and_file_location_changes(self):
        index = json.loads((self.root / "index.json").read_text())
        entry = next(x for x in index["champions"] if x["id"] == "7360")
        record = json.loads((self.root / entry["path"]).read_text())
        old = self.root / entry["path"]
        entry["name"], entry["path"] = "Ronda Renamed", "renamed/arbitrary.json"
        record["name"] = entry["name"]
        write_json(self.root / entry["path"], record)
        old.unlink()
        write_json(self.root / "index.json", index)
        self.assertEqual(CatalogReader(self.root).get_character("raid:7360")["character_id"], "raid:7360")

    def test_alias_collision_returns_candidates_without_guessing(self):
        self.metadata({"raid:1030": {"aliases": ["nuker"]}, "raid:7360": {"aliases": ["nuker"]}})
        with self.assertRaises(QueryError) as context:
            CatalogReader(self.root).get_character("nuker")
        self.assertEqual(context.exception.code, "AMBIGUOUS_CHARACTER")
        self.assertEqual(len(context.exception.details["candidates"]), 2)

    def test_purpose_tagged_full_art_is_added_only_when_explicitly_provided(self):
        art = self.root / "art/full.webp"
        art.parent.mkdir()
        art.write_bytes(b"image")
        self.metadata({"raid:7360": {"images": {"full_art": "art/full.webp"}}})
        self.assertEqual(CatalogReader(self.root).get_character("Ronda")["images"]["full_art"], art.as_uri())

    def test_search_is_bounded_and_does_not_treat_substring_as_exact_lookup(self):
        result = CatalogReader(self.root).search_characters("", limit=1, offset=1)
        self.assertEqual(result["total"], 2)
        self.assertEqual(len(result["items"]), 1)
        with self.assertRaises(QueryError) as context:
            CatalogReader(self.root).get_character("Ron")
        self.assertEqual(context.exception.code, "CHARACTER_NOT_FOUND")

    def test_masteries_are_self_contained_and_can_be_filtered_by_mode(self):
        result = CatalogReader(self.root).get_masteries("Ronda", mode="pve")
        self.assertEqual(result["character"]["character_id"], "raid:7360")
        self.assertEqual([b["build_id"] for b in result["builds"]], ["pve-1"])
        self.assertEqual(set(result["masteries"]), set(result["builds"][0]["mastery_ids"]))
        self.assertTrue(all(m["images"]["icon"].startswith("file:///") for m in result["masteries"].values()))

    def test_unvalidated_builds_are_counted_but_not_recommended_by_default(self):
        path = self.root / "builds/7360.json"
        data = json.loads(path.read_text())
        bad = {**data["builds"].pop(0), "issues": ["14 nodes"]}
        bad["masteries"] = bad["masteries"][:-1]
        data["unvalidatedBuilds"], data["status"] = [bad], "partial"
        write_json(path, data)
        result = CatalogReader(self.root).get_masteries("Ronda", mode="pve")
        self.assertEqual(result["builds"], [])
        self.assertEqual(result["unvalidated_builds"], [])
        self.assertEqual(result["unvalidated_build_count"], 1)
        self.assertEqual(result["status"], "unvalidated")
        self.assertTrue(result["warnings"])
        included = CatalogReader(self.root).get_masteries("Ronda", include_unvalidated=True)
        self.assertEqual(len(included["unvalidated_builds"]), 1)

    def test_missing_masteries_is_distinct_from_no_recommendations(self):
        with self.assertRaises(QueryError) as context:
            CatalogReader(self.root).get_masteries("Alure")
        self.assertEqual(context.exception.code, "MASTERIES_NOT_IMPORTED")
        data = {"schemaVersion": 1, "championId": "1030", "source": {}, "builds": [], "unvalidatedBuilds": []}
        write_json(self.root / "builds/1030.json", data)
        self.assertEqual(CatalogReader(self.root).get_masteries("Alure")["status"], "no_recommendations")

    def test_malformed_source_fields_cannot_escape_as_successful_public_data(self):
        build_path, definition_path = self.root / "builds/7360.json", self.root / "masteries.json"
        original_build = json.loads(build_path.read_text())
        original_definitions = json.loads(definition_path.read_text())
        for field, value in [("mode", "unexpected-mode"), ("label", 123), ("masteries", "not-a-list")]:
            with self.subTest(build_field=field):
                data = copy.deepcopy(original_build)
                data["builds"][0][field] = value
                write_json(build_path, data)
                with self.assertRaises(QueryError) as context:
                    CatalogReader(self.root).get_masteries("Ronda")
                self.assertEqual(context.exception.code, "INVALID_CATALOG")
        write_json(build_path, original_build)
        for field, value in [("tier", 99), ("tree", "unknown"), ("description", [])]:
            with self.subTest(mastery_field=field):
                data = copy.deepcopy(original_definitions)
                data["masteries"]["deadly-precision"][field] = value
                write_json(definition_path, data)
                with self.assertRaises(QueryError):
                    CatalogReader(self.root).get_masteries("Ronda")

    def test_path_traversal_and_unsupported_storage_version_are_rejected(self):
        index_path = self.root / "index.json"
        index = json.loads(index_path.read_text())
        index["champions"][0]["path"] = "../outside.json"
        write_json(index_path, index)
        with self.assertRaises(QueryError):
            CatalogReader(self.root).get_character(index["champions"][0]["id"])
        index["schemaVersion"] = 999
        write_json(index_path, index)
        with self.assertRaises(QueryError):
            CatalogReader(self.root)

    def cli(self, *args):
        return subprocess.run([sys.executable, str(CLI), "--catalog", str(self.root), *args],
                              capture_output=True, text=True, cwd=self.root, timeout=10)

    def test_cli_success_and_errors_are_single_json_documents(self):
        success = self.cli("get_character", "Alure")
        self.assertEqual(success.returncode, 0)
        result = json.loads(success.stdout)
        self.assertEqual(result["schema_version"], 1)
        self.assertTrue(result["ok"])
        self.assertEqual(success.stderr, "")
        for args, status, code in [(('get_character', 'does-not-exist'), 3, 'CHARACTER_NOT_FOUND'),
                                   (('get_masteries', 'Ronda', '--mode', 'invalid'), 2, 'INVALID_ARGUMENTS')]:
            failed = self.cli(*args)
            self.assertEqual(failed.returncode, status)
            self.assertEqual(json.loads(failed.stdout)["error"]["code"], code)
            self.assertNotIn("Traceback", failed.stderr)

    def test_cli_does_not_modify_catalogue_or_execute_selector_as_shell(self):
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in self.root.rglob('*') if p.is_file()}
        self.cli("get_masteries", "Ronda")
        self.cli("get_character", "Ronda; touch injected")
        after = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in self.root.rglob('*') if p.is_file()}
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
