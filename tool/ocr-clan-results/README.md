# ocr-clan-results

Swift CLI for OCR extraction of clan wars pages into a canonical import model.

## Canonical model (for import)

Each tournament record contains only import-relevant fields:

- `startsAt`, `endsAt`
- `hasPersonalRewards` (`0|1`)
- `opponentClanName`
- `totals` (`mine` vs `opponent`)
- `playersOurs` (`rank`, `playerNick`, `points`)

Schemas:

- `schema/page-ocr-clan-wars.schema.json` (single tournament import record)
- `schema/run-report.schema.json` (full OCR run report)

## Usage

```bash
swift tool/ocr-clan-results/ocr-clan-results.swift \
  --image /Users/$USER/Downloads/clanwars/10.04.25.jpg \
  --participants-json /absolute/path/to/clan-members.json \
  --output tool/ocr-clan-results/out/page-ocr-clan-wars.json
```

Participants JSON accepted shapes:

- `["Nick1", "Nick2"]`
- `{ "participants": ["Nick1", "Nick2"] }`
- `{ "players": [{ "nick": "Nick1" }, { "mainNickname": "Nick2" }] }`

The tool auto-corrects recognized nicknames to the nearest clan participant using string distance.

## Admin Upload CLI (Intermediate Results)

Interactive uploader flow:

1. Loads roster from admin API.
2. Runs Swift OCR using roster aliases as participants.
3. If filename date inference fails, offers fallback window selection (auto-candidate from KT anchor or manual UTC start/end).
4. Prompts to create missing players (if any).
5. Shows preview and prompts before `/apply`.

Usage:

```bash
KT_ADMIN_TOKEN=... node tool/ocr-clan-results/upload-intermediate.mjs \
  --image /absolute/path/to/screenshot.jpg \
  --api-base-url http://localhost:8787/api/admin/clan-wars/intermediate
```

Environment defaults:

- `KT_ADMIN_TOKEN`: admin ingest token (`--token` overrides it)
- `KT_ADMIN_API_BASE_URL`: admin API base (`--api-base-url` overrides it)

Minimal invocation with env defaults:

```bash
KT_ADMIN_TOKEN=... KT_ADMIN_API_BASE_URL=https://vibr-clan.org/api/admin/clan-wars/intermediate \
  node tool/ocr-clan-results/upload-intermediate.mjs --image /absolute/path/to/screenshot.jpg
```

Render SQL stubs from canonical JSON:

```bash
swift tool/ocr-clan-results/render-import-sql.swift \
  tool/ocr-clan-results/out/page-ocr-clan-wars.json \
  tool/ocr-clan-results/out/clanwars-canonical-import.sql
```

## Notes

- The tool maps screenshot date to KT window using bi-weekly calendar anchoring from `2025-03-25T09:00:00Z`.
- If filename inference fails, uploader can rerun OCR with explicit `--window-start-at/--window-ends-at`.
- Uploader apply payload uses roster-based `rosterExpectation.expectedCount` (active roster, including newly created players) so partial OCR row sets are rejected by validation.
- Opponent player breakdown is intentionally not extracted.
- Output is intentionally import-focused: no confidence/debug fields in canonical records.
- The tool validates `sum(playersOurs.points)` against OCR `totals.mine`. If mismatch is above `1%` (configurable via `--max-mine-total-diff-ratio`), it exits with code `2`.
