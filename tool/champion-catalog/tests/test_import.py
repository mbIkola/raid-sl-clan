import hashlib
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from catalog import read_json, write_json
from import_catalog import import_rsl, import_hh, select_champions, verify
from unittest.mock import patch
from test_catalog import mastery_html

IMAGE = b"RIFF\x04\x00\x00\x00WEBPtest-image"


class FixtureSource:
    def __init__(self):
        self.attack = "Punch\n\nAttacks 1 enemy."
        self.fail_images = False

    def get(self, url, refresh=False):
        if "db-version" in url:
            return b'{"version":"123"}'
        if "pages.json" in url:
            return b'{"champions":{"Ronda":"ronda","Kael":"kael"}}'
        with closing(sqlite3.connect(":memory:")) as database:
            database.execute('CREATE TABLE champions (IGid TEXT, name TEXT, faction TEXT, rarity TEXT, affinity TEXT, type TEXT, image TEXT, s1 TEXT)')
            database.executemany('INSERT INTO champions VALUES (?,?,?,?,?,?,?,?)', [
                ("7360", "Ronda", "Banner Lords", "Legendary", "Magic", "Attack", "Ronda", self.attack),
                ("1010", "Kael", "Dark Elves", "Rare", "Magic", "Attack", "Kael", "Bolt\n\nAttacks.")])
            database.execute('CREATE TABLE effects (id TEXT, description TEXT)')
            database.commit()
            return database.serialize()

    def image(self, url, destination, refresh=False):
        if self.fail_images:
            raise OSError("fixture image unavailable")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(IMAGE)


class ImportTest(unittest.TestCase):
    def test_repeated_invalid_refresh_preserves_original_valid_build_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            root, source = Path(directory), FixtureSource()
            import_rsl(root, source)
            url = "https://hellhades.com/raid/champions/ronda/"
            html = mastery_html()
            with patch("import_catalog.hh_pages", return_value={"ronda": url}):
                with patch.object(source, "get", return_value=html.encode()):
                    import_hh(root, source, selector="Ronda")
                original = read_json(root / "builds/7360.json")["source"]
                broken = html.replace('class="msb-mastery-image"', 'class="msb-mastery-image rslm-disabled"', 1)
                with patch.object(source, "get", return_value=broken.encode()):
                    import_hh(root, source, selector="Ronda")
                    import_hh(root, source, selector="Ronda")
            result = read_json(root / "builds/7360.json")
            preserved = next(b for b in result["builds"] if b["id"] == "pve-1")
            self.assertEqual(preserved["preservedFrom"], original)
            self.assertEqual(result["status"], "partial")
            self.assertEqual(len(result["unvalidatedBuilds"]), 1)

    def test_mastery_icon_failure_preserves_previous_build_and_dictionary(self):
        with tempfile.TemporaryDirectory() as directory:
            root, source = Path(directory), FixtureSource()
            import_rsl(root, source)
            old = {"schemaVersion": 1, "builds": [{"id": "old", "masteries": ["old"]}]}
            write_json(root / "builds/7360.json", old)
            write_json(root / "masteries.json", {"masteries": {"old": {"id": "old"}}})
            parsed = {"builds": [{"id": "new", "masteries": ["new"]}], "source": {},
                      "masteries": {"new": {"id": "new", "sourceImage": "https://assets.hellhades.com/new.png", "icon": "images/masteries/new.png"}}}
            source.fail_images = True
            with patch("import_catalog.hh_pages", return_value={"ronda": "https://hellhades.com/raid/champions/ronda/"}), patch("import_catalog.parse_masteries", return_value=parsed):
                # Fixture HTML body is irrelevant here: parser is a separately tested boundary.
                with patch.object(source, "get", return_value=b"<h1>Ronda</h1>"):
                    report = import_hh(root, source, selector="Ronda")
            self.assertTrue(report["errors"])
            self.assertEqual(read_json(root / "builds/7360.json"), old)
            self.assertEqual(list(read_json(root / "masteries.json")["masteries"]), ["old"])

    def test_full_import_and_single_refresh_preserve_unrelated_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root, source = Path(directory), FixtureSource()
            report = import_rsl(root, source)
            self.assertEqual(report["imported"], 2)
            kael = (root / "champions/1010.json").read_bytes()
            source.attack = "Punch\n\nUpdated skill."
            report = import_rsl(root, source, selector="Ronda")
            self.assertEqual(report["imported"], 1)
            self.assertEqual((root / "champions/1010.json").read_bytes(), kael)
            self.assertEqual(len(read_json(root / "index.json")["champions"]), 2)
            self.assertEqual(read_json(root / "champions/7360.json")["forms"][0]["skills"][0]["description"], "Updated skill.")
            self.assertEqual(verify(root)["errors"], [])

    def test_image_failure_preserves_previous_json_and_index(self):
        with tempfile.TemporaryDirectory() as directory:
            root, source = Path(directory), FixtureSource()
            import_rsl(root, source)
            previous = (root / "champions/7360.json").read_bytes()
            previous_entries = read_json(root / "index.json")["champions"]
            source.attack, source.fail_images = "New\n\nBroken refresh.", True
            report = import_rsl(root, source, selector="7360", refresh_images=True)
            self.assertEqual(report["imported"], 0)
            self.assertEqual(len(report["errors"]), 1)
            self.assertEqual((root / "champions/7360.json").read_bytes(), previous)
            self.assertEqual(read_json(root / "index.json")["champions"], previous_entries)

    def test_verification_detects_missing_and_invalid_images(self):
        with tempfile.TemporaryDirectory() as directory:
            root, source = Path(directory), FixtureSource()
            import_rsl(root, source)
            (root / "images/champions/7360.webp").unlink()
            (root / "images/skills/1010_s1.webp").write_text("<html>error</html>")
            self.assertEqual(len(verify(root)["errors"]), 2)

    def test_unknown_selector_fails_before_overwriting_catalogue(self):
        with tempfile.TemporaryDirectory() as directory:
            root, source = Path(directory), FixtureSource()
            import_rsl(root, source)
            before = hashlib.sha256((root / "index.json").read_bytes()).hexdigest()
            with self.assertRaises(ValueError):
                import_rsl(root, source, selector="not-a-real-champion")
            self.assertEqual(hashlib.sha256((root / "index.json").read_bytes()).hexdigest(), before)


if __name__ == "__main__":
    unittest.main()
