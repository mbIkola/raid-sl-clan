# Local RAID champion catalogue

Dependency-free Python 3.11+ importer. Downloads public RSL-X game reference data and images, plus separate HellHades mastery recommendations. It never invokes Wrangler, uploads data, or deploys anything.

For offline reading and Agent SDK integration, use the executable [`raid-catalog`](raid-catalog) and its [public JSON contract](READ-API.md):

```bash
tool/champion-catalog/raid-catalog get_character Alure
tool/champion-catalog/raid-catalog get_masteries Ronda --mode pve
```

From the repository root:

```bash
# Complete catalogue, images and available mastery builds.
python3 tool/champion-catalog/import_catalog.py all

# Independent sources (RSL-X must run before HellHades).
python3 tool/champion-catalog/import_catalog.py rsl-x
python3 tool/champion-catalog/import_catalog.py hellhades

# Refresh one champion, including every mythical form.
python3 tool/champion-catalog/import_catalog.py all --champion Ronda --refresh
python3 tool/champion-catalog/import_catalog.py all --champion 7360 --refresh
python3 tool/champion-catalog/import_catalog.py rsl-x --champion siegfrund-the-nephilim

# Check every indexed record, image signature and mastery reference.
python3 tool/champion-catalog/import_catalog.py verify

# Offline tests, including full import / single refresh / interrupted download.
python3 -m unittest discover -s tool/champion-catalog/tests -v
```

## Output

The default output is `<repository>/local/champion-catalog/`, excluded from Git. Override with `--output /absolute/path`.

| Path | Content |
| --- | --- |
| `index.json` | Lightweight index of champions, with relative record and portrait paths |
| `champions/<game-id>.json` | Champion metadata, forms, stats, auras, skills and provenance |
| `effects.json` | RSL-X effect dictionary |
| `masteries.json` | Shared mastery definitions, branches, tiers and image paths |
| `builds/<game-id>.json` | Separate HellHades recommendations with PvE/PvP labels |
| `images/champions/` | Portraits |
| `images/skills/` | Skill icons, including distinct mythical forms |
| `images/masteries/` | Shared mastery icons |
| `sources/rsl-x/` | Original SQLite, page map, version and snapshot hash |
| `.cache/http/` | Download cache (HTML/XML compressed with gzip) and per-response provenance |
| `reports/` | Most recent import result for each source and verification result |

The initial complete import also includes `reports/full-import.json` and `reports/single-champion-verification.json`: the full source reports captured before a real single-champion refresh, and the hash comparison proving that refresh left other champion/build records unchanged. Later ordinary runs update the current per-source reports.

Every JSON document has `schemaVersion: 1` where it defines a reusable catalogue schema. Image paths are relative to the output root. Names and skill descriptions come from the English source; there is no invented Russian translation.

Champion IDs use the base of RSL-X `IGid`. For example, Ronda is `7360`; mythical `8210_f1` and `8210_f2` live under `champions/8210.json` as distinct `forms`. SQLite row IDs are intentionally discarded because upstream rebuilds can change them. Each skill retains `rawText` alongside parsed `name`, `description`, `cooldown`, `upgrades` and `multipliers`; these fields do not claim to represent the full combat mechanics as an executable model. Skill `slot` retains the upstream `s1..s4` / `p1..p2` designation. Icon numbering follows the source's sequential skill display order.

Mastery definitions and recommended selections are different datasets. A build contains a list of mastery IDs, a source build ID, a mode and a label (for example, PvE / Clan Boss). `no_recommendations` means a matching page exists without mastery builds. Unmatched champion names and source/request/parser errors are listed separately in `reports/hellhades.json`; missing builds are never invented. Any explicit source URL exceptions belong in `source-overrides.json`, keyed by game ID. Page headings must still match champion names.

The parser validates a complete 66-node mastery grid, 15 distinct selected nodes, at most two selected branches and exactly one tier-six selection. HellHades' empty `pve-0` / `pvp-0` placeholders and unused unlabelled empty grids are skipped. Source selections with 14/16 nodes or other invalid choices are retained verbatim in `unvalidatedBuilds` with `issues`, separately from validated `builds`; their document status is `partial` or `unvalidated`. The report lists these editorial source issues under `sourceIssues`. A previously valid version of the same build is retained with `preservedFrom` provenance when possible. Structurally incomplete grids, wrong page headings and disappearing previously populated recommendations remain errors and do not replace the previous file. The initial source URL exceptions cover Azure, Aina and Alika (`-2` URLs), and Vasal of the Seal (`vasal-of-the-seals` URL).

## Refresh and failure behavior

Each run checks the public RSL-X version, reuses a versioned SQLite download and fetches the current page map. New records and existing champion changes are imported. A single-champion run updates only that champion's JSON/images and index entry; shared source snapshots, dictionaries and reports can also change. Files left over from removed upstream champions are retained on disk but excluded from a successful full index rebuild.

Images are reused unless `--refresh-images` is set for RSL-X. HellHades HTML is cached by default; `--refresh` refetches it, useful after editorial changes. Deleting `.cache/http/` is safe, although the next run will download source pages again. Re-running an interrupted import reuses successful downloads. There are at most four workers by default, at most three for HellHades, a minimum interval between host requests, 45-second request timeouts and bounded retries for transient errors. Use `--workers 2 --delay 0.5` for slower downloads.

Champion JSON is replaced atomically only after all of its referenced RSL-X images have downloaded. Failed champion refreshes retain previous JSON and index entries. Individual files use atomic replacement; an entire import is not a transactional directory swap. Inspect source reports before treating a partially refreshed folder as a complete snapshot. Request/parser/image errors return a nonzero exit code. Absence of an upstream mastery recommendation is a reported coverage gap, not a fabricated success.

Sources are third-party reference snapshots, not an official API or a guarantee that every skill matches the latest game patch. Source URLs, retrieval times and the SQLite snapshot version/hash make updates traceable. Recommended builds remain attributed to HellHades.
