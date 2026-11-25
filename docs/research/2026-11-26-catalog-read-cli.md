# Catalogue read CLI contract and implementation plan

Provide a read-only, offline interface over the imported files. The CLI is an adapter: the public snake_case contract is independent of the importer's camelCase storage. Every machine response has integer `schema_version: 1`, boolean `ok`, and either `data` or `error`. Use stable namespaced game IDs (`raid:1030`), never name slugs, as public `character_id` values.

Commands: `get_character <selector>`, `search_characters [query] --limit 20 --offset 0`, `get_masteries <selector> --mode all|pve|pvp [--include-unvalidated]`. Selectors support public/raw game IDs and exact canonical/localized names, aliases or source slugs. Normalize Unicode, case and whitespace without discarding Cyrillic. Reject ambiguous exact matches with candidates; substring search never chooses a character. No fuzzy auto-selection.

Character output contains `character_id`, `canonical_name`, `names`, `aliases`, `images`. Images are keyed by purpose and returned as absolute file URIs. Omit unknown translations and unavailable image purposes. Optional catalogue-root `metadata.json` (or explicit `--metadata`) supplies authored translations, aliases and additional relative image paths, keyed by stable public IDs. Imports never write this file. Do not fabricate translations or artwork.

Mastery output includes the character, filtered validated builds, definitions of referenced masteries, source attribution and warnings. Bad source selections are counted but hidden by default, and can be requested explicitly as `unvalidated_builds`. Definitions include branch, tier, description and local icon URI. Missing imported mastery data is an explicit error, distinct from a source page with no recommendations.

Machine stdout contains exactly one JSON document. Exit codes: 0 success, 2 invalid arguments, 3 not found/not imported, 4 ambiguous selector, 5 invalid data/I/O. Help remains human-readable. Paths must remain within the selected catalogue root; validate source schema versions and record identities. The reader performs no downloads and writes no catalogue files.

Implement `reader.py` for queries and normalization, executable `raid-catalog` for argument parsing/envelopes, a JSON Schema for the output contract, and an optional Agent SDK function-tool factory. Agent configuration supplies executable/catalogue paths; model arguments never select arbitrary commands or paths. Invoke processes with argv, not a shell. Local file URIs are references for the local agent host, not downloadable URLs for OpenAI servers.

Implementation sequence: write failing fixture/subprocess tests; implement reader and CLI; add formal schema, adapter example and documentation; validate all existing local records and real mastery results; run standalone and repository gates where available; review, commit and push code only. Beads is unavailable in this environment; no replacement task store is introduced.

## Verification

The standalone suite passes 34 tests, including Unicode/alias lookup, ambiguity, renamed/moved records, image purposes/URI escaping, malformed-source rejection, unvalidated-build separation, read-only behavior and real CLI subprocess calls. Adapter tests use a stand-in SDK decorator while exercising the actual async handlers and CLI processes. The consuming app must verify real `function_tool` decoration/schema generation and its agent run; `openai-agents` is not installed in this repository and no model/API call was made. Integration follows the official [Agents SDK function tools documentation](https://openai.github.io/openai-agents-python/tools/#function-tools).

A complete scan of the existing local catalogue read all 1,055 characters, 2,541 validated and 32 unvalidated mastery builds. Every returned mastery ID had its definition in the same response. SHA-256 checks of 18,989 catalogue files before and after found no changes or created files. The scan returned 65 distinct referenced mastery definitions (the full imported dictionary has 66; unselected definitions are intentionally not included in individual recommendations).

All five repository baseline pnpm commands were attempted again and each failed before command execution because the configured `_auth` value is invalid base64. Credentials were not changed or bypassed. The independent reader/importer tests require no package installation or credentials. Beads sync remains unavailable because `bd` is absent. Nothing was deployed or uploaded to Cloudflare.
