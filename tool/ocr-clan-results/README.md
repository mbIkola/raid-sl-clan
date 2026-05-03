# ocr-clan-results

Swift CLI for OCR parsing of clan wars report pages and inference of `has_personal_rewards`.

## What it does

- Reads image (`.jpg/.jpeg/.png`) and markdown (`.md/.txt`) resources.
- Runs Vision OCR for images.
- Builds canonical JSON for each page (`page ocr clan wars` model).
- Infers `has_personal_rewards` using OCR markers (currently marker-based: `"Личные награды"` family).
- Produces run report JSON with a ready list of windows to mark as personal rewards.

## Canonical model

Schema for one page:
- `schema/page-ocr-clan-wars.schema.json`

The tool output is a run report with:
- `pages[]` (array of canonical page models)
- `recommendedPersonalRewardsWindows[]` (inferred windows for DB update)

## Usage

```bash
swift tool/ocr-clan-results/ocr-clan-results.swift \
  --input /Users/$USER/Downloads/clanwars \
  --output tool/ocr-clan-results/out/clanwars-ocr-report.json \
  --min-confidence 0.8
```

## Notes

- Window boundaries are derived from file names like `15.01.26.jpg`:
  - end date: `2026-01-15`
  - start date: `end - 2 days`
- Files that do not match `dd.MM.yy*` are still OCR-processed, but do not produce a tournament window key.
