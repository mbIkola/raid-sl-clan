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
  --input /Users/$USER/Downloads/clanwars \
  --output tool/ocr-clan-results/out/clanwars-canonical-import.json
```

Render SQL stubs from canonical JSON:

```bash
swift tool/ocr-clan-results/render-import-sql.swift \
  tool/ocr-clan-results/out/clanwars-canonical-import.json \
  tool/ocr-clan-results/out/clanwars-canonical-import.sql
```

## Notes

- The tool maps screenshots to KT windows using bi-weekly calendar anchoring from `2025-03-25T00:00:00Z`.
- Opponent player breakdown is intentionally not extracted.
- Output is intentionally import-focused: no confidence/debug fields in canonical records.
