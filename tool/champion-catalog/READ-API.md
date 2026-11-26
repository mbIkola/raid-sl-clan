# Read CLI / Agent SDK contract v1

`raid-catalog` is an executable, offline, read-only CLI. It adapts the imported storage to a stable public JSON contract; consumers never need to join files, know filenames or parse importer internals. Python 3.11+ is sufficient. It does not import the Agents SDK, fetch data, write catalogue files or deploy anything.

## Commands

Run from the repository root:

```bash
tool/champion-catalog/raid-catalog get_character Alure
tool/champion-catalog/raid-catalog get_character raid:1030
tool/champion-catalog/raid-catalog search_characters Alu --limit 10 --offset 0
tool/champion-catalog/raid-catalog get_masteries Ronda
tool/champion-catalog/raid-catalog get_masteries Ronda --mode pve
tool/champion-catalog/raid-catalog get_masteries 'Joan the Luminant' --include-unvalidated
```

Use an absolute executable path from another working directory. Global options precede the command:

```bash
/absolute/repository/tool/champion-catalog/raid-catalog \
  --catalog /absolute/catalogue \
  --metadata /absolute/authored-metadata.json \
  get_masteries 'Аллюра' --mode pve
```

`--catalog` defaults to this repository's `local/champion-catalog`. Metadata is optional; the default is `<catalog>/metadata.json` if it exists. An explicitly supplied missing or invalid metadata file is an error. Only known names/translations/aliases resolve: the current imported data supplies English names, not automatic Russian translation or transliteration.

| Command | Input | `data` result |
| --- | --- | --- |
| `get_character` | Stable/raw game ID, exact name, alias or source slug | Character |
| `search_characters` | Optional substring query; limit 1..100 (default 20), offset >=0 | `{items: Character[], total, limit, offset}` |
| `get_masteries` | Same character selector; `--mode all/pve/pvp`; optional `--include-unvalidated` | Self-contained Recommendations |

Lookup normalizes Unicode compatibility forms, case and whitespace, retaining non-Latin scripts. Exact lookup does not silently select a substring/fuzzy match. Colliding names or aliases return candidate IDs; call again using one of them. Stable IDs have priority over names/aliases. Search returns deterministic order by canonical name, then ID. An empty search query lists the catalogue with pagination.

## Envelope and character

Except for `--help`, stdout contains exactly one UTF-8 JSON document, followed by a newline. There are no progress logs on stdout. `schema_version` is the public format version, separate from storage `schemaVersion`. Validate against [read-contract.schema.json](read-contract.schema.json).

Example real output for Alure, abbreviated only in the filesystem prefix:

```json
{
  "schema_version": 1,
  "ok": true,
  "data": {
    "character_id": "raid:1030",
    "canonical_name": "Alure",
    "names": {"en": "Alure"},
    "aliases": [],
    "images": {"portrait": "file:///absolute/catalogue/images/champions/1030.webp"}
  }
}
```

`character_id` comes from the game's numeric identity and survives name changes, translations, moves and reimports. It is **not** the name-based slug. Mythical forms share their parent character identity. The canonical name is the source English name; `names.en` is always present and equal to it. Unknown translations are absent, not empty strings. Authored aliases are returned without inventing nicknames. Image keys identify purpose (`portrait`, optionally `full_art`, etc.). Missing artwork types are omitted; the current download contains portraits, not full artwork. Returned file URIs use resolved absolute paths and percent-encode spaces/non-ASCII characters. Missing referenced images are reported as data errors.

## Names, aliases and extra artwork

Author `<catalog>/metadata.json`, or pass `--metadata` to use a separately versioned file:

```json
{
  "schema_version": 1,
  "characters": {
    "raid:1030": {
      "names": {"ru": "Аллюра"},
      "aliases": ["алюра"]
    }
  }
}
```

This is an example of adding the user's supplied translation, not a claim that translations have been imported. Unknown character IDs, invalid metadata or a conflicting `names.en` are errors. An optional `images` map adds/overrides image purposes with **relative paths within the catalogue** (for example `"full_art": "art/alure-full.webp"` once that file exists). The reader resolves them to absolute file URIs; traversal and symlink escapes are rejected. Metadata is independent of importer output and survives a full refresh.

## Recommendations (`get_masteries`)

`data` contains:

| Field | Meaning |
| --- | --- |
| `character` | Complete Character object above |
| `status` | `available`, `partial`, `unvalidated` or `no_recommendations`, after mode filtering |
| `source` | `{provider, url, fetched_at}`; unknown source fields are null |
| `builds` | Validated matching builds |
| `masteries` | Map keyed by mastery ID, containing definitions for every ID in returned builds |
| `unvalidated_builds` | Empty by default; original failed source selections only when explicitly requested |
| `unvalidated_build_count` | Count of failed source selections for the selected mode, even when hidden |
| `warnings` | Structured source warnings with `code`, `count`, `message` and `build_ids` |

A build contains `build_id` (source ID such as `pve-1`), `mode`, `label` (such as `Clan Boss`), `validation` and `mastery_ids`. Build IDs are scoped to a character and provider. An unvalidated build additionally contains `issues`. A retained older valid build may contain `preserved_from` source provenance. The API never chooses the right build for an unspecified team or gameplay role.

Each definition contains `mastery_id`, English `name`, `description`, `tree` (`offense`, `defense`, `support`), integer `tier` (1..6), and `images.icon` when available. Definitions are returned once per distinct referenced ID. No joins or second lookup are required. Validation checks selection count/identity, branches and tier-six choice; it does **not** prove a build is optimal or current gameplay advice. Mode-only filtering can legitimately return no recommendations.

`partial` means validated recommendations exist alongside failed source selections; `unvalidated` means only failed selections exist. Invalid source selections are never mixed into `builds`. `no_recommendations` means an imported mastery document has no matching selections. A missing import is an error (`MASTERIES_NOT_IMPORTED`), not an empty successful result.

## Errors

```json
{
  "schema_version": 1,
  "ok": false,
  "error": {
    "code": "AMBIGUOUS_CHARACTER",
    "message": "Multiple characters match; select a character_id",
    "details": {"candidates": [
      {"character_id": "raid:1030", "canonical_name": "Alure"},
      {"character_id": "raid:7360", "canonical_name": "Ronda"}
    ]}
  }
}
```

The candidates above illustrate a deliberately colliding authored alias, not a collision in the English catalogue.

| Exit | Codes |
| --- | --- |
| 0 | `ok: true` |
| 2 | `INVALID_ARGUMENTS` |
| 3 | `CHARACTER_NOT_FOUND`, `MASTERIES_NOT_IMPORTED` |
| 4 | `AMBIGUOUS_CHARACTER` |
| 5 | `INVALID_CATALOG`, `INVALID_METADATA` |

Read stdout even for nonzero exits; do not discard the structured error by using `check=True` without reading its output. Operational failures before Python/CLI startup are process failures, not contract responses. Unsupported schema versions fail explicitly. The adapter's public v1 is independent of importer filenames/camelCase fields; future incompatible public changes require a new `schema_version`.

## Agent SDK integration

Use the optional [agent_sdk_tools.py](agent_sdk_tools.py) factory in the **consuming application**, which already owns its `openai-agents` dependency:

```python
import sys
from agents import Agent

sys.path.insert(0, "/absolute/repository/tool/champion-catalog")
from agent_sdk_tools import create_catalog_tools

agent = Agent(
    name="RAID assistant",
    tools=create_catalog_tools(
        catalog_dir="/absolute/repository/local/champion-catalog",
        # metadata_path="/absolute/authored-metadata.json",  # optional
    ),
)
```

The factory uses the SDK's [`function_tool`](https://openai.github.io/openai-agents-python/tools/#function-tools) mechanism and exposes exactly the three business operations above. Each function returns the CLI JSON envelope as a string. The host configures executable/catalogue/metadata paths; the model cannot choose arbitrary shell commands or filesystem roots. The subprocess client uses argv, a 15-second timeout, cancellation cleanup and envelope/exit-status checks. CLI business errors remain structured tool results so the agent can disambiguate or recover. SDK installation, schema extraction and an actual model run must be verified in the consuming app; this repo's offline tests exercise the handlers with a stand-in decorator and actual CLI subprocesses.

Both processes must have access to the same catalogue filesystem (or the agent host can use its own mounted/copied catalogue with `--catalog`). `file://` is a **local reference**; OpenAI servers cannot fetch it. If the model needs to see an image, the consuming application must read that file and supply image content through its image-input/tool-output handling. This adapter does not upload images or silently turn local paths into public URLs.
