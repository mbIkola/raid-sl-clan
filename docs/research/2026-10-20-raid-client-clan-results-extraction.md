# RAID client clan results: structured collection research notes

Status: research notes, 2026-10-20. No collector was implemented or run.

## Decision and scope

The desired workflow is semi-automatic: an operator opens the relevant RAID screen on macOS and may run a command to collect the displayed results. One clan leader's client is the initial source. Continuous background operation, battle automation, and OCR are outside the preferred path. The earlier [macOS capture/OCR research](automating-raid-shadow-legends-clan-result-tracking-on-macos.md) remains historical context, but its OCR recommendation is no longer the project direction. OCR proved costly to correct and maintain in this project.

The collection targets are Hydra Clash, Chimera Clash, and Clan Wars (CvC): member totals, individual runs or scores, teams, and any available champion-level performance and build data. Existing schema already distinguishes `hydra_player_result`, `hydra_team_run`, `hydra_team_champion_performance`, their Chimera counterparts, and `clan_wars_player_score` in `platform/migrations/0002_clan_competition_schema.sql`. An eventual collector should preserve source, collection time, competition window, and stable deduplication keys. No claim is made yet that every target field can be extracted.

## Direct observations

1. A screenshot of the running macOS RAID client on 2026-10-20 showed the Hydra **Clan Result** dialog. It displayed multiple clan members in one client, their individual runs, difficulty, team power, six champion portraits per run, run points, and per-member totals. This corrects the earlier assumption that collecting clan data would necessarily require a collector on every member's device. The screen itself does **not** establish where or how long those records remain in process memory.
2. The operator reports that deeper RAID views show sets/builds and individual champion damage for clan members. Those detail views were **not independently inspected** during this session. They are candidate fields to verify, not confirmed extraction capability. The operator also expects comparable Chimera and Clan Wars views; those screens were not inspected.
3. The running Gestal Desktop showed a completed Hydra Smart Battle with displayed damage of 1.77B, Clash points of 7.11B, 1000 turns, 213 boss turns, and individual champion damage. The `B` values were rounded in the UI, so their underlying integer precision was not verified. Its rule editor showed a preset with 22 rules and conditions such as turn count and buff presence. The operator observed Gestal waiting for a manually started RAID battle or for the relevant stage screen before acting. This supports an event-driven, screen-scoped collector rather than an always-on one.
4. The installed Gestal Desktop version examined was 0.9.2. Its bundle contains an Electron UI (`app.asar`), a .NET host (`Gestal.Engine.Host`), `Gestal.Engine.Core.dll`, `Gestal.Engine.Extraction.Mac.dll`, Google.Protobuf, and SignalR components. String inspection of the macOS extraction module showed `task_for_pid` and `mach_vm_read_overwrite`, consistent with reading another process's memory. It also showed `mach_vm_write`, `mach_vm_protect`, and thread-control functions. The presence of these symbols does **not** prove which functions run for any given feature. Core/host metadata included names such as `GetBattleResult`, `GetBattleTelemetry`, `GetBattleScreenState`, and `GetBackgroundBattleState`. These are evidence of an extraction architecture, not a documented Gestal API or proof of clan-table extraction.
5. Gestal's [RAID page](https://gestal.gg/raid) says its extractor reads game memory. Its separate [extractor page](https://gestal.gg/raid/extractor) describes that extractor as read-only; that statement does not cover Auto Battle. Its [Desktop page](https://gestal.gg/raid/optimizer-download) documents Smart Battle conditions and targeting. The installed SignalR components likely connect Gestal's UI and its own engine; they do not establish any public IPC endpoint from RAID.

## Candidate extraction paths

### Passive process-memory reader

After the operator opens a results view, inspect the client state and extract already decoded records without writing to the game process, injecting code, or invoking game methods. This could produce exact numeric values and avoid screenshots. It is a hypothesis until a bounded experiment confirms (a) an attach is possible on the installed macOS build, (b) the target records are locatable, (c) the needed fields are present, and (d) the reader is robust across screen transitions and game updates. A screen rendering a value only proves that the client had it at some point; the parsed object may be transient or transformed from multiple responses. Gestal's bundled write and thread APIs are not a suitable definition of read-only behavior for our own collector.

### Network response observation

The clan result screens imply that the client receives enough data to render them, but the wire format and whether one response contains the full table are unknown. The operator reports general traffic routed through `http://127.0.0.1:8118`, believed to be Tinyproxy; RAID's use of that proxy was **not verified**. [Tinyproxy documentation](https://tinyproxy.github.io/) says HTTPS is forwarded unchanged through `CONNECT`. Such a proxy can reveal the connection target but not the HTTPS request headers, path, or response body. Seeing the response would require TLS interception and a trusted interception certificate; certificate pinning or a separate trust store could reject the connection. Even successful decryption might expose binary, compressed, or application-encoded data rather than ready JSON. A clan member has extracted statistics using a phone connected through a laptop proxy, but that does not establish that the macOS RAID client behaves the same way. No proxy or certificate configuration was changed during this research.

### Game logs and existing local interfaces

Read-only log inspection is a low-impact first check, although logs may contain no useful result payloads. A documented local export or IPC interface would be preferable, but none was established. Unity's normal player debugger is not a safe assumption for a release game: [Unity documents](https://docs.unity3d.com/ja/current/Manual/managed-code-debugging.html) that player debugging requires Development Build and Script Debugging options. Gestal's private local engine may be worth evaluating as a research lead, but coupling production ingestion to undocumented Gestal internals would create a second version-sensitive dependency.

### Screen parsing

Automatic window capture with deterministic parsing could remove manual screenshot posting, but it still relies on image recognition and does not meet the current project preference. Keep it only as a fallback if structured extraction proves infeasible. Do not restart the old OCR/AI correction workflow by default.

## Suggested bounded research sequence

1. Define the minimal export contract against the existing D1 schema: competition window, source account/clan, player identity, each run or score, exact numeric values, and optional champion-level details. Separate values visible in the overview from values available only after opening a detail panel.
2. With the operator opening Hydra Clan Result, verify which records the client actually loads, then compare one structured export with the visible table and its detail views. A first proof should cover all visible members, not just the operator's own battle. Avoid uploading raw process dumps or credentials.
3. Determine whether a passive read or a non-intercepting local source can meet that contract. Treat network TLS interception as a separate experiment requiring explicit security review; the existing Tinyproxy is not already a decrypted feed.
4. Repeat the same evidence check for Chimera and Clan Wars. Do not infer their schema or availability solely from Hydra.
5. Only after an extraction path works, build a local command that emits normalized JSON and a separate ingestion path with source provenance, validation, idempotency, and manual review of uncertain identities. Keep RAID-specific mechanics out of `packages/core` and `packages/application`.

## Risks and limits

- Process-memory layouts and private protocols can change on every RAID release. Agent-assisted coding reduces investigation time, not maintenance cost.
- Read-only memory access is still client introspection. [Plarium's Terms of Use](https://company.plarium.com/en/terms/terms-of-use/) restrict reverse engineering; there is no established approval for this collector. No legal conclusion is made here.
- A TLS interception proxy can expose session credentials and other account traffic, not just clan statistics. It also changes the connection path and may break the game. Ordinary Tinyproxy forwarding does not have that property.
- A successful one-client collector depends on what the account is authorized to view and what the current screen has loaded. It should not promise historical or hidden data without direct verification.

## No action taken during this consultation

No RAID process memory was read, no game binary was modified, no TLS interception or certificate trust change was configured, and no collector was implemented. The observations above come from the visible app UI, read-only inspection of the installed Gestal bundle, public documentation, and the operator's reports; each source is identified where it matters.
