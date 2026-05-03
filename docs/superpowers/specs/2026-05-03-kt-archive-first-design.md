# KT Archive-First Page Design

Date: 2026-05-03  
Status: Draft for review

## 1. Context

The clan dashboard already includes a readiness card for KT and a countdown link target (`/dashboard/clan-wars`), but no dedicated KT page exists yet.

User terminology note:

- `КВ`, `КТ`, `клан варс`, `клан турнир`, `clan wars`, and `clan tournament` are treated as the same activity.

## 2. Goal

Build a dedicated KT page with an **Archive-First** focus: historical clarity over pseudo-live command features.

Primary user value:

- see past KT windows quickly;
- identify roster stability;
- detect contribution decline trends.

## 3. Non-Goals

- No live war-room orchestration.
- No win-probability prediction.
- No synthetic command-center metrics unsupported by current data.
- No expanded data ingestion work in this scope.

## 4. Page Information Architecture (`/dashboard/clan-wars`)

1. `KT Timeline Header`
- countdown to next `start` or current window `reset/end`;
- personal rewards badge (`с личными наградами` / `без`).

2. `История окон КТ` (primary block)
- table of latest windows (default 12);
- columns: window dates, rewards flag, clan total points, active contributors (`points > 0`), top-1 player.

3. `Стабильность состава`
- player-level archive rollup across selected windows.

4. `Кто проседает`
- players with negative trend comparing recent windows vs baseline.

## 5. Data Sources And Metrics

Data tables already available:

- `competition_window` (`activity_type='clan_wars'`);
- `clan_wars_report` (`has_personal_rewards`);
- `clan_wars_player_score` (`points`, `player_profile_id`);
- `player_profile` (name/status for display).

### 5.1 Header Metrics

Use existing anchor logic from repository layer (`getClanWarsAnchorStateUtc(nowIso)`):

- `targetAt`;
- `targetKind` (`start` | `reset`);
- `hasPersonalRewards`.

### 5.2 KT Windows History Metrics

Per window:

- `windowStart`, `windowEnd`;
- `hasPersonalRewards`;
- `clanTotalPoints = SUM(points)`;
- `activeContributors = COUNT(DISTINCT player_profile_id WHERE points > 0)`;
- `topPlayer` by max `points` with deterministic tie-break by `player name ASC`.

### 5.3 Roster Stability Metrics

Per player over selected `N` windows:

- `windowsPlayed` (`points > 0`);
- `avgPoints`;
- `bestPoints`;
- `lastWindowPoints`;
- `consistencyScore = windowsPlayed / N`.

### 5.4 Decline Radar Metrics

For players with at least 3 played windows:

- `recentAvg`: average over latest 3 windows;
- `baselineAvg`: average over preceding windows (prefer last 6 preceding, else all preceding);
- `delta = recentAvg - baselineAvg`;
- descending risk list by most negative `delta`.

## 6. UX Rules (Mobile-First)

Mobile order:

1. header strip;
2. history table;
3. roster stability;
4. decline radar.

Desktop layout:

- top: header + period filter (`12`, `24`, `all`);
- middle: wide sortable history table;
- bottom: two-column grid (`Стабильность состава`, `Кто проседает`).

Interaction notes:

- KT readiness card on `/dashboard` remains clickable to `/dashboard/clan-wars`;
- `DashboardNav` gets a direct `KT` link.

## 7. Rendering and State

- Server renders page snapshot (same pattern as dashboard).
- Countdown runs on client via existing `CountdownTimer`.
- History/stability/decline use server-provided snapshot and deterministic sorting defaults.
- Empty state for no rows: explicit message, never silent blank cards.

## 8. Error Handling

- Invalid or missing countdown target: render neutral fallback (`—`) and log typed warning.
- Query partial failure: fail-fast response for snapshot endpoint, avoid mixing stale and fresh blocks.
- Missing personal rewards flag: treat as `0`/`без` by schema default.

## 9. Testing Expectations

Minimum tests for KT page rollout:

1. snapshot query unit tests for history aggregation fields;
2. stability metric tests (`windowsPlayed`, `consistencyScore`);
3. decline radar tests (recent vs baseline delta ordering);
4. page render test covering all four KT blocks and nav link presence;
5. countdown display test for `start` and `reset` header modes.

## 10. Acceptance Criteria

- Dashboard readiness KT card shows countdown and links to `/dashboard/clan-wars`.
- Dashboard navigation includes `KT`.
- KT page renders archive-first structure with real DB-backed metrics.
- No fabricated command-center blocks are introduced.

## 11. Recommended Delivery Slice

1. Add KT route and server snapshot loader for archive metrics.
2. Add UI blocks in archive-first order.
3. Wire nav link and readiness link validation.
4. Add tests and run baseline repo quality gates.
