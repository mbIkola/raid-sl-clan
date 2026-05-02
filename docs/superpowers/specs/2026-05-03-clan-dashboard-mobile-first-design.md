# Raid SL Clan Mobile-First Clan Dashboard Design

Date: 2026-05-03  
Status: Draft for review

## 1. Context

The current site foundation is in place, but the public dashboard must become a practical clan page for everyday members, not just an MVP shell.  
Historical imports already provide useful competition data in D1 for Hydra, Chimera, Clan Wars (KT), and Siege at the report level.  
The dashboard should prioritize immediate usefulness on mobile while still presenting a strong atmospheric desktop layout.

## 2. Primary User

Primary user: all clan members (mobile-first).

This dashboard should answer "what matters right now?" in seconds:

- current readiness by activity;
- current important event (fusion);
- current top/bottom performers by activity;
- short-term trends.

## 3. Goals

Deliver one mobile-first dashboard page with four zones:

1. `Зона боеготовности`
2. `Зона слияния`
3. `Зона топ перформеров`
4. `Зона тренды`

Additional goals:

- Preserve one interaction pattern for activity switching (`chips + swipe`) where applicable.
- Keep ranking logic intentionally simple (rank all active players, including zeroes).
- Use D1 as primary source where schema already supports the metric.
- Keep fusion as a repository-managed temporary source.

## 4. Non-Goals

- Building full per-activity analytics pages in this scope.
- Building an admin UI for fusion/event editing.
- Building a complete fusion calendar parser (calendar stays an image for v1).
- Treating preview D1 parity as a release gate.

## 5. Visual Direction

Atmospheric dark background with translucent cards:

- Desktop background source: `~/Downloads/dark-elves.png` (16:9).
- Mobile background source: `~/Downloads/mavara.png` (portrait).
- Content overlays on semi-transparent panels for readability.

Navigation:

- Mobile: hamburger menu.
- Desktop: visible menu items.

## 6. Information Architecture

### 6.1 `Зона боеготовности`

Four clickable cards:

- Hydra
- Chimera
- KT (Clan Wars)
- Siege

Card intent:

- Hydra/Chimera: keys spent, total current damage, countdown to reset.
- KT: countdown to start, status (`с личными наградами` / `без`).
- Siege: countdown to start.

Cards are links to future detailed pages for each activity.

### 6.2 `Зона слияния`

Single "current important event" block.

v1 source: manual JSON in repository (temporary solution).

States:

- Active fusion: hero name + portrait + period + calendar image link.
- No fusion: explicit idle state (`Слияния сейчас нет`).

### 6.3 `Зона топ перформеров`

Two independent blocks:

- `Top 5 Performers`
- `Bottom 5`

Each block has its own activity selector:

- `Hydra / Chimera / KT / Siege(def)`
- pattern: chips + swipe
- default: `Hydra`

Population rule (both blocks): only current clan roster (`player_profile.status = 'active'`).

Ranking rule: include all active players (including zero values), no minimum participation thresholds.

Activity metrics:

- Hydra: sum damage (current selected reporting range).
- Chimera: sum damage.
- KT: sum points over the latest 4 KT reports with personal rewards.
- Siege(def): defense wins.

KT note below table:

`* KT ranking is calculated as SUM(points) over the latest 4 KT reports with personal rewards.`

### 6.4 `Зона тренды`

8-week trend block for Hydra and Chimera (2 months).

Scope for v1:

- clan-level aggregate trend, not per-player deep analytics.
- mobile readable chart/card treatment.

## 7. Time And Date Rules

Canonical rule:

- All stored timestamps in DB/JSON are ISO8601 strings with offset (typically UTC).

Display rule:

- Convert for user display via `Intl` in user timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- No manual timezone math.

## 8. Countdown Component Contract

Introduce one shared countdown component for all relevant zones.

Behavior:

- Input: target ISO datetime.
- Output formatting:
  - default: days + hours
  - under 1 hour: minutes + seconds
- Adaptive tick cadence (do not rerender every second when unnecessary).
- Emit one-shot `onTimerEnd` when crossing zero.
- Stop internal interval after end event.

Container-level end messages:

- Fusion: `Слияние закончено`
- Hydra/Chimera/KT/Siege: `Закончено, идет подсчет результатов`

The post-end state remains until next data refresh/import.

## 9. Data Sources And Schema Implications

### 9.1 Data already covered by D1

- Readiness windows: `competition_window` + mode reports.
- Hydra/Chimera aggregates: `*_player_result`.
- KT points: `clan_wars_player_score`.
- Active roster filter: `player_profile.status`.
- Trends: competition windows + mode aggregates.

### 9.2 Fusion data (temporary)

Repository JSON model for v1:

- `status`: `active | idle`
- `title`
- `startsAt` (ISO)
- `endsAt` (ISO)
- `heroPortraitImageUrl` (required)
- `calendarImageUrl` (required for active)
- `note` (optional)

### 9.3 Required schema update for KT rewards flag

Current schema does not include a personal-rewards flag for KT reports.

Required migration:

- add `has_personal_rewards INTEGER NOT NULL DEFAULT 0 CHECK (has_personal_rewards IN (0,1))`
  to `clan_wars_report`.

KT ranking query logic:

- take latest 4 reports where `has_personal_rewards = 1` (by `created_at DESC`);
- aggregate `SUM(points)` from `clan_wars_player_score`;
- if fewer than 4 reports exist, use available rows.

### 9.4 Siege(def) metric data gap

Current schema stores siege report outcome at match level, but does not yet store per-player defense wins.

Therefore, `Siege(def)` ranking requires one of:

1. schema extension for per-player siege stats (recommended), or
2. temporary manual import source for defense wins.

Recommendation: add a dedicated per-player siege stats table in a follow-up migration and feed it through imports.

## 10. Mobile Interaction Pattern

For activity switching in ranking blocks:

- explicit chips (discoverable for tap users),
- optional swipe (faster for gesture users),
- same pattern reused in both `Top 5` and `Bottom 5`.

No nested tabs inside tabs.

## 11. Error Handling And Empty States

- Missing/late data in a zone should render a clear placeholder, not break page layout.
- Countdown with invalid/missing target datetime should render a neutral fallback (`—`) and log a typed warning.
- Fusion idle state is first-class, not an error.

## 12. Testing Expectations

Minimum verification for this design:

- Unit tests for countdown formatting and `onTimerEnd` one-shot behavior.
- Unit tests for timezone-aware date rendering component.
- Query tests for KT latest-4-with-personal-rewards aggregation.
- Query tests for active-roster filtering in Top/Bottom lists.
- Rendering tests for zone presence and activity selector defaults (`Hydra`).

## 13. Implementation Recommendation

Recommended order:

1. Add `has_personal_rewards` migration for KT.
2. Implement shared date/countdown primitives.
3. Implement zones with D1-backed data fetchers.
4. Add fusion JSON source and rendering.
5. Add temporary Siege(def) handling with explicit TODO for full D1 support.

This order keeps the dashboard immediately useful while exposing data gaps explicitly instead of hiding them.
