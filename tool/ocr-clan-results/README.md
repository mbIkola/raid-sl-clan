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

Render SQL stubs from canonical JSON:

```bash
swift tool/ocr-clan-results/render-import-sql.swift \
  tool/ocr-clan-results/out/page-ocr-clan-wars.json \
  tool/ocr-clan-results/out/clanwars-canonical-import.sql
```

## Notes

- The tool maps screenshot date to KT window using bi-weekly calendar anchoring from `2025-03-25T00:00:00Z`.
- Opponent player breakdown is intentionally not extracted.
- Output is intentionally import-focused: no confidence/debug fields in canonical records.
- The tool validates `sum(playersOurs.points)` against OCR `totals.mine`. If mismatch is above `1%` (configurable via `--max-mine-total-diff-ratio`), it exits with code `2`.
