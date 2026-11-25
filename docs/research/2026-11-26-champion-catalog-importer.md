# Local champion catalogue importer

Approved scope: import the complete public RSL-X SQLite catalogue into local JSON and image files; import HellHades mastery recommendations separately; support refreshing one champion. No Cloudflare changes or uploads. Generated data stays outside Git.

## Design

Use a dependency-free Python CLI under `tool/champion-catalog`. RSL-X supplies a versioned SQLite snapshot, page names, champion portraits and sequential skill icons. Group stable `IGid` values by champion, retaining mythical form identifiers. Never use the rebuild-dependent SQLite row ID as identity. Keep original skill text alongside parsed names, descriptions, cooldowns, upgrades and multipliers.

HellHades discovery uses champion XML sitemaps. Parse named mastery containers and selected image elements, retaining tree, tier, source URL and build label. Keep the global mastery dictionary separate from per-champion recommendations. Match names conservatively and report unmatched pages rather than assigning another champion's build.

Live inspection found complete upstream grids with erroneous 14/16-node selections. Retain these under `unvalidatedBuilds` with explicit issues; keep validated selections under `builds`. Preserve a previously valid version of the same build when available. This records source evidence without silently repairing editorial recommendations or discarding the other valid builds. Unlabelled empty template grids are not recommendations.

Output defaults to ignored `local/champion-catalog/`: `index.json`, `champions/<id>.json`, `masteries.json`, `builds/<id>.json`, images, source snapshots, HTTP cache and per-source reports. JSON writes are atomic. Downloads use bounded concurrency, timeouts, retries, gzip, caching and validation. Failed refreshes preserve previous champion/build files. Reports distinguish source gaps from request/parser failures; failures give a nonzero exit code. One-champion refresh merges its index entry and leaves other records intact.

## Execution plan

1. Write and run failing standard-library tests for stable identities, mythical forms, skill text preservation, mastery build selection and atomic single-record updates.
2. Implement the RSL-X normalizer, HTML mastery parser, cached HTTP client and CLI. Run tests with `python3 -m unittest discover -s tool/champion-catalog/tests -v`.
3. Run the full local RSL-X and HellHades imports. Resolve observed source exceptions with explicit mappings or reported gaps; verify every referenced local asset and the single-champion refresh.
4. Document exact commands, schema and results. Run repository gates where the declared environment permits. Review the final diff and commit/push only importer code and documentation on `codex/champion-catalog-importer`; never push generated catalogue files or deploy.

Tracking: repository `bd` CLI is unavailable in this environment; do not substitute another issue store.

## Validation environment

The importer has standalone standard-library tests; they do not depend on workspace packages or credentials. All five repository baseline commands were attempted (`pnpm test`, `pnpm typecheck`, recursive build, Cloudflare build and local migration list), but each stopped before execution because pnpm rejected the configured `_auth` value as invalid base64. Workspace dependencies are not installed. The credential configuration was not changed or bypassed. No Cloudflare deployment or remote migration command was run.

## Local import results (26 November 2026, Europe/Zurich)

RSL-X snapshot `1795438291845`: all 1,055 champions / 1,090 forms imported, with 1,055 portraits and 3,794 skill icons. HellHades: all 1,055 champion pages matched and imported, 66 mastery definitions/icons, 2,541 validated builds. Another 32 source selections across 31 champions fail build validation and are retained as unvalidated evidence. There were no request/parser/image errors or unmatched champions in the final full run.

Verification checked 4,915 referenced image files and every indexed champion/mastery reference with no errors. A subsequent real `all --champion Ronda --refresh` succeeded and left SHA-256 hashes of the other 2,108 champion/build JSON files unchanged. Mina's first-form passive transformation classification was checked in the downloaded record. The standalone suite contains 19 passing tests, including source anomaly handling, cache compression, failed-refresh preservation and repeated preservation provenance.

Detailed reproducible local evidence lives in ignored `local/champion-catalog/reports/full-import.json`, `verification.json` and `single-champion-verification.json`. The generated output occupies approximately 319 MiB including the compressed HTTP cache; images alone occupy approximately 38 MiB. These generated files are deliberately not committed or uploaded.
