# Raid SL Clan i18next Localization And Globalization Design

Date: 2026-05-03  
Status: Draft for review

## 1. Context

The current `apps/web` UI mixes English and Russian copy, and several labels are hardcoded in components and repository output.  
Locale-aware formatting exists in isolated components, but there is no unified locale state, no language switcher, and no full translation workflow.

## 2. Goal

Introduce complete localization for the web app with:

1. Supported languages: Russian (`ru`), Ukrainian (`uk`), English (`en`).
2. One route set (no locale-prefixed URLs).
3. Browser language auto-detection with fallback to Russian.
4. Language switcher in menu with persisted user choice in `localStorage`.
5. Locale-bound number/date/relative-time formatting.
6. Runtime language switch without page reload.
7. Localization coverage for UI strings and units like `avg` and `last`.

## 3. Non-Goals

1. No localization of Telegram/webhook/server-side messaging in this iteration.
2. No locale-prefixed routing (`/ru/...`, `/uk/...`, `/en/...`).
3. No runtime translation loading from external endpoints.
4. No TSLint integration (deprecated ecosystem).

## 4. Key Decisions

1. Translation resources are repository-owned and versioned in GitHub.
2. `i18next` resources are bundled with the frontend (no network dependency).
3. Locale resolution order:
   - persisted language in `localStorage`;
   - browser language (`navigator.languages` / `navigator.language`);
   - fallback `ru`.
4. Server/domain layers return data and flags, not human-readable UI phrases.
5. Hardcoded UI copy in JSX/markup attributes is blocked in CI via ESLint errors.

## 5. Architecture

## 5.1 i18n Runtime

1. Add `i18next` + `react-i18next` in `apps/web`.
2. Introduce a single client-side i18n bootstrap module with:
   - supported languages map (`ru`, `uk`, `en`);
   - fallback language (`ru`);
   - in-bundle resource object for each namespace.
3. Introduce a `LocaleProvider` client component mounted near app root to expose:
   - current language;
   - `setLanguage(language)` action;
   - typed formatter helpers (number/date/relative-time).

## 5.2 Locale And Intl Binding

Define explicit mappings:

1. `ru -> ru-RU`
2. `uk -> uk-UA`
3. `en -> en-US`

All formatters and locale-aware components use the provider language, never ad-hoc `Intl.*.resolvedOptions().locale` for primary locale decisions.

## 5.3 Translation Resource Structure

Recommended namespaces:

1. `common`
2. `menu`
3. `landing`
4. `about`
5. `dashboard`
6. `units`

Examples:

1. `units.avg`, `units.last`, `units.vs`, `units.keys`, `units.damage`
2. `dashboard.readiness.title`
3. `dashboard.kt.history.empty`
4. `menu.languageSwitcher.label`

## 5.4 UI Boundary Refactor

Move human-readable assembly from repository/server to UI:

1. Replace server-returned phrases (for example `statusLabel`, `primaryValue`) with data primitives and enum-like state.
2. Compose final user-facing strings in components through `t(...)` and Intl formatters.
3. Keep data values (player names, numeric metrics, ISO timestamps) unchanged and only format at presentation layer.

## 6. Browser Detection And Persistence

1. On first client render:
   - read `localStorage` language key;
   - if missing/invalid, infer from browser locale;
   - if unsupported, use `ru`.
2. On language change:
   - call `i18n.changeLanguage(...)`;
   - persist selected language in `localStorage`;
   - update `document.documentElement.lang`.
3. Language switching must not trigger navigation or full reload.

## 7. Menu Language Switcher

Add switcher to menu/navigation surface:

1. Shows current language.
2. Allows selection among `RU`, `UK`, `EN`.
3. Uses provider action to switch language instantly.
4. Uses localized labels and accessible naming via i18n keys.

## 8. Formatting Rules

## 8.1 Numbers

All metric values use `Intl.NumberFormat` with the selected locale.

## 8.2 Dates And Times

Use locale-aware `Intl.DateTimeFormat` with user timezone resolution (`Intl.DateTimeFormat().resolvedOptions().timeZone`) while locale comes from selected language.

## 8.3 Relative/Countdown

1. Replace static unit suffixes (`d/h/m/s`) with localized units/messages.
2. Prefer `Intl.RelativeTimeFormat` where semantics match.
3. Keep current countdown update cadence; only localized rendering changes.

## 9. Error Handling

1. If `localStorage` is unavailable, keep language in in-memory state and continue.
2. If translation key is missing:
   - fallback to `ru` resource;
   - log developer warning in development.
3. If Intl formatting fails for invalid input, render safe fallback (`—` or stringified value) without runtime crash.
4. Unsupported browser locale always resolves to `ru`.

## 10. ESLint Quality Gate (Hard Blocker)

Enforce localization discipline with CI-blocking ESLint rules:

1. Hardcoded user-facing text in JSX text nodes is an error.
2. Hardcoded user-facing text in attributes is an error, including:
   - `aria-label`
   - `title`
   - `alt`
   - `placeholder`
   - similar user-visible strings.
3. Allowed exceptions:
   - URLs and route paths;
   - technical IDs/tokens;
   - numeric literals;
   - data-driven values rendered from model fields;
   - explicitly documented allowlist cases.
4. Rule severity is `error` from day one (no warning phase).

## 11. Testing Strategy

1. Locale resolver tests:
   - `localStorage` priority over browser locale;
   - fallback to `ru` when unsupported.
2. Switcher behavior tests:
   - changes language without reload;
   - writes to `localStorage`;
   - updates `html[lang]`.
3. Rendering tests for core pages in `ru/uk/en`.
4. Formatter tests for number/date/relative formatting by locale.
5. ESLint tests/config validation ensuring hardcoded strings fail lint.

## 12. Acceptance Criteria

1. `apps/web` user-facing copy is sourced from i18n keys.
2. RU/UK/EN are fully switchable at runtime without page reload.
3. Language preference persists across tab reloads via `localStorage`.
4. Number/date/relative output follows the active language locale mapping.
5. Route structure remains unchanged (single route set).
6. ESLint blocks hardcoded text in JSX and localization-relevant attributes.

## 13. Delivery Scope

This design applies to `apps/web` only for this pass. Telegram/webhook/backend localization is explicitly deferred.
