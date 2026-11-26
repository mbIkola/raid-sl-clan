import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from catalog import normalize_champions, parse_masteries, update_index, parse_skill


def champion(**overrides):
    row = dict(IGid="7360", name="Ronda", faction="Banner Lords", rarity="Legendary",
                affinity="Magic", type="Attack", image="Ronda", invocable=0,
                hp=14865, atk=1542, s1="Punch\n\nAttacks 1 enemy.")
    row.update(overrides)
    return row


def mastery_html():
    html = ["<h1>Ronda</h1>"]
    for group, label in [("pve-1", "Clan Boss"), ("pvp-1", "Nuker")]:
        html.append(f'<div class="msb-accordion" data-tab="{group}">{label}</div><div id="{group}" class="msb-container">')
        for tree in ["offense", "defense", "support"]:
            html.append(f'<div class="msb-{tree} msb-section">')
            ordinal = 0
            for tier in range(1, 7):
                html.append('<div class="msb-mastery-row">')
                for column in range(2 if tier == 1 else 4):
                    key = f"{tree}-{ordinal}"
                    key = {"offense-0": "deadly-precision", "offense-1": "blade-disciple", "defense-0": "tough-skin"}.get(key, key)
                    # Ten offense and five defense selections, including a tier-six mastery.
                    selected = (tree == "offense" and ordinal in [0, 2, 3, 4, 6, 7, 10, 14, 15, 18]) or (tree == "defense" and ordinal in [0, 2, 6, 10, 14])
                    disabled = "" if selected else " rslm-disabled"
                    html.append(f'<div class="msb-mastery-image{disabled}"><img alt="{key}" title="{key} - Description" data-orig-src="https://assets.hellhades.com/{key}.png"></div>')
                    ordinal += 1
                html.append("</div>")
            html.append("</div>")
        html.append("</div>")
    return "".join(html)


class CatalogTest(unittest.TestCase):
    def test_explicit_passive_marker_overrides_an_active_source_slot(self):
        skill = parse_skill("Metamorph [P]\n\nTransforms automatically.", "s4", "10370_f1", 4)
        self.assertEqual(skill["kind"], "passive")
        skill = parse_skill("Metamorph\n\nTransforms.", "s4", "10370_f2", 4)
        self.assertEqual(skill["kind"], "active")

    def test_mythical_forms_share_champion_but_keep_distinct_skills_and_icons(self):
        rows = [dict(champion(), IGid=f"8210_f{form}", name="Siegfrund", s1=f"Hit {form}\n\nAttack.",
                     p1="Transform [P]\n\nTransform.") for form in [1, 2]]
        result = normalize_champions(rows, {"Siegfrund": "siegfrund"}, "2026-11-26T00:00:00Z")
        self.assertEqual(list(result), ["8210"])
        self.assertEqual([f["id"] for f in result["8210"]["forms"]], ["8210_f1", "8210_f2"])
        passive = result["8210"]["forms"][0]["skills"][1]
        self.assertEqual(passive["slot"], "p1")
        self.assertEqual(passive["icon"], "images/skills/8210_f1_s2.webp")

    def test_skill_preserves_raw_text_and_separates_cooldown_books_multiplier(self):
        raw = "Phase Rushdown\n⟳ 4 Turns\n\nAttacks 3 times.\n\nLevel 2: Damage +10%\nLevel 3: Cooldown -1\n\nMultiplier: 1.9*ATK"
        result = parse_skill(raw, "s2", "7360", 2)
        self.assertEqual(result["rawText"], raw)
        self.assertEqual(result["cooldown"], 4)
        self.assertEqual(result["description"], "Attacks 3 times.")
        self.assertEqual(result["upgrades"][-1], {"level": 3, "description": "Cooldown -1"})
        self.assertEqual(result["multipliers"], ["Multiplier: 1.9*ATK"])

    def test_missing_or_repeated_source_identity_is_rejected(self):
        with self.assertRaises(ValueError):
            normalize_champions([dict(champion(), IGid="")], {}, "now")
        with self.assertRaises(ValueError):
            normalize_champions([champion(), champion()], {}, "now")

    def test_masteries_keep_builds_separate_and_ignore_disabled_nodes(self):
        result = parse_masteries(mastery_html(), "https://hellhades.com/raid/champions/ronda/", "Ronda")
        self.assertEqual([b["label"] for b in result["builds"]], ["Clan Boss", "Nuker"])
        self.assertIn("deadly-precision", result["builds"][0]["masteries"])
        self.assertNotIn("blade-disciple", result["builds"][0]["masteries"])
        self.assertEqual(len(result["builds"][0]["masteries"]), 15)
        self.assertEqual(result["masteries"]["tough-skin"]["tree"], "defense")
        self.assertEqual(result["masteries"]["deadly-precision"]["tier"], 1)
        self.assertIn("blade-disciple", result["masteries"])

    def test_incomplete_mastery_selection_is_separate_from_valid_builds(self):
        broken = mastery_html().replace('class="msb-mastery-image"', 'class="msb-mastery-image rslm-disabled"', 1)
        result = parse_masteries(broken, "https://hellhades.com/raid/champions/ronda/", "Ronda")
        self.assertEqual(result["status"], "partial")
        self.assertEqual([b["id"] for b in result["builds"]], ["pvp-1"])
        self.assertEqual(len(result["unvalidatedBuilds"][0]["masteries"]), 14)
        self.assertTrue(result["unvalidatedBuilds"][0]["issues"])

    def test_explicit_empty_mode_placeholder_does_not_discard_real_builds(self):
        html = mastery_html() + '<div id="pvp-0" class="msb-container">No PVP masteries</div>'
        result = parse_masteries(html, "https://hellhades.com/raid/champions/ronda/", "Ronda")
        self.assertEqual(len(result["builds"]), 2)

    def test_source_mastery_identifier_cannot_escape_output_directory(self):
        html = mastery_html().replace('alt="deadly-precision"', 'alt="../../outside"', 1)
        with self.assertRaises(ValueError):
            parse_masteries(html, "https://hellhades.com/raid/champions/ronda/", "Ronda")

    def test_wrong_champion_page_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_masteries("<h1>Kael</h1>", "https://hellhades.com/raid/champions/kael/", "Ronda")

    def test_single_update_preserves_other_champion_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "index.json"
            other = {"id": "999", "name": "Other", "path": "champions/999.json"}
            path.write_text(json.dumps({"schemaVersion": 1, "champions": [other]}))
            record = normalize_champions([champion()], {"Ronda": "ronda"}, "now")["7360"]
            update_index(Path(directory), [record], "now", full=False)
            result = json.loads(path.read_text())
            self.assertIn(other, result["champions"])
            self.assertEqual(len(result["champions"]), 2)
            update_index(Path(directory), [record], "now", full=True)
            self.assertEqual(len(json.loads(path.read_text())["champions"]), 1)


if __name__ == "__main__":
    unittest.main()
