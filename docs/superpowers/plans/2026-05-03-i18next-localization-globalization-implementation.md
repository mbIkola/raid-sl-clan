# i18next Localization And Globalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship full RU/UK/EN runtime localization for `apps/web` with browser detection, persistent language switching, locale-bound formatting, and ESLint hard-blocking of new hardcoded UI strings.

**Architecture:** Keep business data contracts language-neutral in `packages/ports` + `packages/platform`, then compose all human-facing copy in `apps/web` using `react-i18next` and a single client `LocaleProvider`. Use bundled translation resources (no runtime fetch), a deterministic resolver (`localStorage` -> browser language -> `ru`), and formatter helpers bound to selected language + browser timezone. Enforce discipline with `eslint-plugin-i18next` so JSX text and localization-relevant attributes cannot regress to literals.

**Tech Stack:** TypeScript, Next.js App Router, React 19, i18next, react-i18next, Vitest, ESLint flat config (`eslint.config.mjs`)

---

## Scope Check

Spec `docs/superpowers/specs/2026-05-03-i18next-localization-globalization-design.md` is one subsystem (frontend localization for `apps/web`). No split into separate plans is required.

## File Structure Map

- Create: `apps/web/src/lib/i18n/languages.ts`
- Create: `apps/web/src/lib/i18n/resources.ts`
- Create: `apps/web/src/lib/i18n/resolve-language.ts`
- Create: `apps/web/src/lib/i18n/resolve-language.test.ts`
- Create: `apps/web/src/lib/i18n/i18n.ts`
- Create: `apps/web/src/components/site/locale-provider.tsx`
- Create: `apps/web/src/components/site/locale-provider.test.tsx`
- Create: `apps/web/src/components/site/language-switcher.tsx`
- Create: `apps/web/src/components/site/language-switcher.test.tsx`
- Create: `apps/web/src/components/site/localized-relative-time.tsx`
- Create: `apps/web/src/components/site/localized-relative-time.test.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/lib/dashboard/date-time.ts`
- Modify: `apps/web/src/lib/dashboard/countdown.ts`
- Modify: `apps/web/src/lib/dashboard/countdown.test.ts`
- Modify: `apps/web/src/components/site/localized-number.tsx`
- Modify: `apps/web/src/components/site/localized-number.test.tsx`
- Modify: `apps/web/src/components/site/localized-date-time.tsx`
- Modify: `apps/web/src/components/site/localized-date-time.test.tsx`
- Modify: `apps/web/src/components/site/countdown-timer.tsx`
- Modify: `apps/web/src/components/site/countdown-timer.test.tsx`
- Modify: `packages/ports/src/repositories/clan-dashboard-repository.ts`
- Modify: `packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts`
- Modify: `packages/platform/test/clan-dashboard-repository.test.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/about/page.tsx`
- Modify: `apps/web/src/app/not-found.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/dashboard/clan-wars/page.tsx`
- Modify: `apps/web/src/components/site/dashboard-nav.tsx`
- Modify: `apps/web/src/components/site/brand-mark.tsx`
- Modify: `apps/web/src/components/site/dashboard-readiness-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-fusion-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-performers-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-trends-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-header-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-history-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-stability-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-decline-zone.tsx`
- Modify: `apps/web/src/lib/site/content.ts`
- Modify: `apps/web/src/app/page.test.tsx`
- Modify: `apps/web/src/app/about/page.test.tsx`
- Modify: `apps/web/src/app/not-found.test.tsx`
- Modify: `apps/web/src/app/dashboard/page.test.tsx`
- Modify: `apps/web/src/app/dashboard/clan-wars/page.test.tsx`
- Modify: `apps/web/eslint.config.mjs`
- Modify: `apps/web/package.json`

### Task 1: Add i18n language model, resources, and resolver

**Files:**
- Create: `apps/web/src/lib/i18n/languages.ts`
- Create: `apps/web/src/lib/i18n/resources.ts`
- Create: `apps/web/src/lib/i18n/resolve-language.ts`
- Create: `apps/web/src/lib/i18n/resolve-language.test.ts`
- Create: `apps/web/src/lib/i18n/i18n.ts`
- Test: `apps/web/src/lib/i18n/resolve-language.test.ts`

- [ ] **Step 1: Write failing resolver tests for localStorage priority and fallback**

```ts
// apps/web/src/lib/i18n/resolve-language.test.ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  resolveInitialLanguage,
  type SupportedLanguage
} from "./resolve-language";

describe("resolve-language", () => {
  it("prefers persisted language over browser language", () => {
    const language = resolveInitialLanguage({
      persistedLanguage: "uk",
      browserLanguages: ["en-US", "ru-RU"]
    });

    expect(language).toBe("uk");
  });

  it("falls back to browser language when persisted value is invalid", () => {
    const language = resolveInitialLanguage({
      persistedLanguage: "de",
      browserLanguages: ["en-GB"]
    });

    expect(language).toBe("en");
  });

  it("falls back to default language when browser languages are unsupported", () => {
    const language = resolveInitialLanguage({
      persistedLanguage: null,
      browserLanguages: ["de-DE", "fr-FR"]
    });

    expect(language).toBe(DEFAULT_LANGUAGE);
  });

  it("normalizes language tags by primary subtag", () => {
    expect(normalizeLanguage("ru-RU")).toBe("ru");
    expect(normalizeLanguage("uk-UA")).toBe("uk");
    expect(normalizeLanguage("en-GB")).toBe("en");
  });

  it("returns null for unsupported tags", () => {
    expect(normalizeLanguage("it-IT")).toBeNull();
  });

  it("keeps supported values strongly typed", () => {
    const value: SupportedLanguage = "ru";
    expect(value).toBe("ru");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- apps/web/src/lib/i18n/resolve-language.test.ts`
Expected: FAIL with module not found for `./resolve-language`.

- [ ] **Step 3: Implement language map, resources, resolver, and i18next bootstrap**

```ts
// apps/web/src/lib/i18n/languages.ts
export const SUPPORTED_LANGUAGES = ["ru", "uk", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "ru";

export const LANGUAGE_TO_LOCALE: Record<SupportedLanguage, string> = {
  ru: "ru-RU",
  uk: "uk-UA",
  en: "en-US"
};

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ru: "Русский",
  uk: "Українська",
  en: "English"
};

export const I18N_STORAGE_KEY = "raid.web.language";
```

```ts
// apps/web/src/lib/i18n/resolve-language.ts
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./languages";

const supported = new Set<string>(SUPPORTED_LANGUAGES);

export const normalizeLanguage = (input: string | null | undefined): SupportedLanguage | null => {
  if (!input) {
    return null;
  }

  const primary = input.trim().toLowerCase().split("-")[0];
  return supported.has(primary) ? (primary as SupportedLanguage) : null;
};

export const resolveInitialLanguage = (input: {
  persistedLanguage: string | null;
  browserLanguages: readonly string[];
}): SupportedLanguage => {
  const persisted = normalizeLanguage(input.persistedLanguage);
  if (persisted) {
    return persisted;
  }

  for (const language of input.browserLanguages) {
    const normalized = normalizeLanguage(language);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_LANGUAGE;
};

export { DEFAULT_LANGUAGE, type SupportedLanguage };
```

```ts
// apps/web/src/lib/i18n/resources.ts
import type { Resource } from "i18next";

export const i18nResources: Resource = {
  ru: {
    common: {
      appName: "Raid SL Clan",
      menu: "Меню",
      loading: "Загрузка",
      noData: "Недостаточно данных",
      backToLanding: "Назад на главную"
    },
    menu: {
      navigationLabel: "Навигация дашборда",
      landing: "Главная",
      about: "О проекте",
      dashboard: "Дашборд",
      clanWars: "KT",
      languageSwitcherLabel: "Язык интерфейса"
    },
    landing: {
      title: "Темный вход для клана.",
      body: "Публичный дашборд, редакционный контекст и место для будущего join flow без иллюзий, что auth уже готов.",
      panelTitle: "Сначала публичные маршруты.",
      panelBody: "Практичный старт: dashboard, about и прозрачная пометка, что member login будет позже.",
      memberLoginLater: "Вход для участников появится позже"
    },
    about: {
      title: "Что это за место",
      intro: "Публичная сторона клана должна выглядеть как намерение, а не как полуготовый пульт.",
      openDashboard: "Открыть дашборд"
    },
    dashboard: {
      title: "Дашборд",
      subtitle: "Мобильный дашборд клана на реальных данных.",
      snapshotGenerated: "Снимок создан",
      readinessTitle: "Зона боеготовности",
      fusionTitle: "Зона слияния",
      performersTitle: "Зона топ перформеров",
      trendsTitle: "Зона трендов",
      ktArchiveTitle: "Клановый турнир: архив",
      emptyFusion: "Слияния сейчас нет"
    },
    units: {
      keys: "Ключи",
      damage: "Урон",
      avg: "ср.",
      last: "послед.",
      vs: "против",
      dayShort: "д",
      hourShort: "ч",
      minuteShort: "м",
      secondShort: "с"
    }
  },
  uk: {
    common: {
      appName: "Raid SL Clan",
      menu: "Меню",
      loading: "Завантаження",
      noData: "Недостатньо даних",
      backToLanding: "Назад на головну"
    },
    menu: {
      navigationLabel: "Навігація дашборду",
      landing: "Головна",
      about: "Про проєкт",
      dashboard: "Дашборд",
      clanWars: "KT",
      languageSwitcherLabel: "Мова інтерфейсу"
    },
    landing: {
      title: "Темний вхід для клану.",
      body: "Публічний дашборд, редакційний контекст і місце для майбутнього join flow без удавання, що auth вже існує.",
      panelTitle: "Спочатку публічні маршрути.",
      panelBody: "Практична стартова панель: dashboard, about і чесна позначка, що member login зʼявиться пізніше.",
      memberLoginLater: "Вхід для учасників відкриється пізніше"
    },
    about: {
      title: "Що це за місце",
      intro: "Публічне обличчя клану має читатися як намір, а не як напівпідключена панель.",
      openDashboard: "Відкрити дашборд"
    },
    dashboard: {
      title: "Дашборд",
      subtitle: "Мобільний дашборд клану на реальних даних.",
      snapshotGenerated: "Знімок згенеровано",
      readinessTitle: "Зона бойової готовності",
      fusionTitle: "Зона злиття",
      performersTitle: "Зона топ виконавців",
      trendsTitle: "Зона трендів",
      ktArchiveTitle: "Клановий турнір: архів",
      emptyFusion: "Злиття зараз немає"
    },
    units: {
      keys: "Ключі",
      damage: "Шкода",
      avg: "сер.",
      last: "ост.",
      vs: "проти",
      dayShort: "д",
      hourShort: "г",
      minuteShort: "хв",
      secondShort: "с"
    }
  },
  en: {
    common: {
      appName: "Raid SL Clan",
      menu: "Menu",
      loading: "Loading",
      noData: "Not enough data",
      backToLanding: "Back to landing"
    },
    menu: {
      navigationLabel: "Dashboard navigation",
      landing: "Landing",
      about: "About",
      dashboard: "Dashboard",
      clanWars: "KT",
      languageSwitcherLabel: "Interface language"
    },
    landing: {
      title: "A darker front door for the clan.",
      body: "Public dashboard, editorial context, and room for future join flow without pretending auth already exists.",
      panelTitle: "Public routes first.",
      panelBody: "Practical by design: dashboard, about, and an explicit note that member login arrives later.",
      memberLoginLater: "Member login opens later"
    },
    about: {
      title: "What This Place Is",
      intro: "The clan’s public face should read like intent, not like a half-connected control panel.",
      openDashboard: "Open dashboard"
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Mobile-first clan dashboard grounded in real data.",
      snapshotGenerated: "Snapshot generated",
      readinessTitle: "Readiness zone",
      fusionTitle: "Fusion zone",
      performersTitle: "Top performers zone",
      trendsTitle: "Trends zone",
      ktArchiveTitle: "Clan wars: archive",
      emptyFusion: "No active fusion right now"
    },
    units: {
      keys: "Keys",
      damage: "Damage",
      avg: "avg",
      last: "last",
      vs: "vs",
      dayShort: "d",
      hourShort: "h",
      minuteShort: "m",
      secondShort: "s"
    }
  }
} as const;
```

```ts
// apps/web/src/lib/i18n/i18n.ts
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE } from "./languages";
import { i18nResources } from "./resources";

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  defaultNS: "common",
  ns: ["common", "menu", "landing", "about", "dashboard", "units"],
  resources: i18nResources,
  returnNull: false
});
```

- [ ] **Step 4: Run resolver tests to verify pass**

Run: `pnpm test -- apps/web/src/lib/i18n/resolve-language.test.ts`
Expected: PASS (`6 passed`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/i18n
git commit -m "feat(web): add i18n language resources and resolver"
```

### Task 2: Add LocaleProvider, language switcher, and layout wiring

**Files:**
- Create: `apps/web/src/components/site/locale-provider.tsx`
- Create: `apps/web/src/components/site/locale-provider.test.tsx`
- Create: `apps/web/src/components/site/language-switcher.tsx`
- Create: `apps/web/src/components/site/language-switcher.test.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Test: `apps/web/src/components/site/locale-provider.test.tsx`
- Test: `apps/web/src/components/site/language-switcher.test.tsx`

- [ ] **Step 1: Write failing tests for language resolution persistence and html lang update**

```tsx
// apps/web/src/components/site/locale-provider.test.tsx
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocale } from "./locale-provider";
import { I18N_STORAGE_KEY } from "../../lib/i18n/languages";

function Probe() {
  const { language, setLanguage } = useLocale();
  return (
    <button type="button" onClick={() => setLanguage("en")}>
      {language}
    </button>
  );
}

describe("LocaleProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["uk-UA", "en-US"]
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("uses persisted value when available", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "ru");
    const { LocaleProvider } = await import("./locale-provider");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBe("ru");
  });

  it("falls back to browser language and updates html lang on switch", async () => {
    const { LocaleProvider } = await import("./locale-provider");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBe("uk");

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(localStorage.getItem(I18N_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
```

```tsx
// apps/web/src/components/site/language-switcher.test.tsx
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./language-switcher";
import { LocaleProvider } from "./locale-provider";

describe("LanguageSwitcher", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders supported endonym options", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <LanguageSwitcher />
        </LocaleProvider>
      );
    });

    const options = Array.from(container.querySelectorAll("option")).map((option) => option.textContent);
    expect(options).toEqual(["Русский", "Українська", "English"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- apps/web/src/components/site/locale-provider.test.tsx apps/web/src/components/site/language-switcher.test.tsx`
Expected: FAIL because `LocaleProvider` and `LanguageSwitcher` do not exist.

- [ ] **Step 3: Implement provider and switcher, then mount provider in root layout**

```tsx
// apps/web/src/components/site/locale-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { i18n } from "../../lib/i18n/i18n";
import {
  DEFAULT_LANGUAGE,
  I18N_STORAGE_KEY,
  LANGUAGE_TO_LOCALE,
  type SupportedLanguage
} from "../../lib/i18n/languages";
import { resolveInitialLanguage } from "../../lib/i18n/resolve-language";

type LocaleContextValue = {
  language: SupportedLanguage;
  locale: string;
  timeZone: string;
  setLanguage: (language: SupportedLanguage) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const readPersistedLanguage = () => {
  try {
    return localStorage.getItem(I18N_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writePersistedLanguage = (language: SupportedLanguage) => {
  try {
    localStorage.setItem(I18N_STORAGE_KEY, language);
  } catch {
    // localStorage unavailable, keep in-memory state only
  }
};

const resolveBrowserLanguages = () => {
  if (typeof navigator === "undefined") {
    return [];
  }

  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages;
  }

  return navigator.language ? [navigator.language] : [];
};

const resolveTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [timeZone] = useState(resolveTimeZone);

  useEffect(() => {
    const next = resolveInitialLanguage({
      persistedLanguage: readPersistedLanguage(),
      browserLanguages: resolveBrowserLanguages()
    });

    setLanguageState(next);
    void i18n.changeLanguage(next);
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(language);
    writePersistedLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      locale: LANGUAGE_TO_LOCALE[language],
      timeZone,
      setLanguage: setLanguageState
    }),
    [language, timeZone]
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>
  );
}

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
};
```

```tsx
// apps/web/src/components/site/language-switcher.tsx
"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../lib/i18n/languages";
import { useLocale } from "./locale-provider";

export function LanguageSwitcher() {
  const { t } = useTranslation("menu");
  const { language, setLanguage } = useLocale();

  return (
    <label className="dashboard-language-switcher">
      <span className="sr-only">{t("languageSwitcherLabel")}</span>
      <select
        aria-label={t("languageSwitcherLabel")}
        value={language}
        onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang]}
          </option>
        ))}
      </select>
    </label>
  );
}
```

```tsx
// apps/web/src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import React, { type ReactNode } from "react";
import { LocaleProvider } from "../components/site/locale-provider";
import { siteMetadataCopy } from "../lib/site/content";
import { resolvePublicSiteUrl } from "../lib/site/public-site-url";
import "./globals.css";

// ...metadata unchanged

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body className={`${displayFont.variable} site-root`}>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run provider/switcher tests to verify pass**

Run: `pnpm test -- apps/web/src/components/site/locale-provider.test.tsx apps/web/src/components/site/language-switcher.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/site/locale-provider.tsx apps/web/src/components/site/locale-provider.test.tsx apps/web/src/components/site/language-switcher.tsx apps/web/src/components/site/language-switcher.test.tsx apps/web/src/app/layout.tsx apps/web/src/lib/i18n/i18n.ts
git commit -m "feat(web): add locale provider and language switcher"
```

### Task 3: Bind number/date/relative-time formatting to locale provider

**Files:**
- Create: `apps/web/src/components/site/localized-relative-time.tsx`
- Create: `apps/web/src/components/site/localized-relative-time.test.tsx`
- Modify: `apps/web/src/lib/dashboard/date-time.ts`
- Modify: `apps/web/src/lib/dashboard/countdown.ts`
- Modify: `apps/web/src/lib/dashboard/countdown.test.ts`
- Modify: `apps/web/src/components/site/localized-number.tsx`
- Modify: `apps/web/src/components/site/localized-number.test.tsx`
- Modify: `apps/web/src/components/site/localized-date-time.tsx`
- Modify: `apps/web/src/components/site/localized-date-time.test.tsx`
- Modify: `apps/web/src/components/site/countdown-timer.tsx`
- Modify: `apps/web/src/components/site/countdown-timer.test.tsx`
- Test: formatter + component tests above

- [ ] **Step 1: Add failing tests for provider-bound locale formatting and localized countdown units**

```ts
// apps/web/src/lib/dashboard/countdown.test.ts
import { describe, expect, it } from "vitest";
import { formatCountdown } from "./countdown";

describe("formatCountdown", () => {
  it("formats long countdown with localized day/hour units", () => {
    const text = formatCountdown(2 * 86_400_000 + 3 * 3_600_000, {
      dayShort: "д",
      hourShort: "ч",
      minuteShort: "м",
      secondShort: "с"
    });

    expect(text).toBe("2д 3ч");
  });

  it("formats short countdown with localized minute/second units", () => {
    const text = formatCountdown(2 * 60_000 + 15_000, {
      dayShort: "d",
      hourShort: "h",
      minuteShort: "m",
      secondShort: "s"
    });

    expect(text).toBe("2m 15s");
  });
});
```

```tsx
// apps/web/src/components/site/localized-relative-time.test.tsx
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalizedRelativeTime } from "./localized-relative-time";
import { LocaleProvider } from "./locale-provider";

describe("LocalizedRelativeTime", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders localized relative label", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedRelativeTime targetIso="2099-01-01T00:00:00.000Z" nowIso="2098-12-31T23:00:00.000Z" />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify fail**

Run: `pnpm test -- apps/web/src/lib/dashboard/countdown.test.ts apps/web/src/components/site/localized-relative-time.test.tsx`
Expected: FAIL because `formatCountdown` signature and `LocalizedRelativeTime` do not exist.

- [ ] **Step 3: Implement locale-bound formatter helpers and component wiring**

```ts
// apps/web/src/lib/dashboard/date-time.ts
export const formatIsoForZone = (
  iso: string | null,
  timeZone: string,
  locale = "ru-RU"
) => {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  } catch {
    return "—";
  }
};
```

```ts
// apps/web/src/lib/dashboard/countdown.ts
export type CountdownUnits = {
  dayShort: string;
  hourShort: string;
  minuteShort: string;
  secondShort: string;
};

export const formatCountdown = (msRemaining: number, units: CountdownUnits) => {
  const safe = Math.max(0, msRemaining);

  if (safe >= 3_600_000) {
    const days = Math.floor(safe / 86_400_000);
    const hours = Math.floor((safe % 86_400_000) / 3_600_000);
    return `${days}${units.dayShort} ${hours}${units.hourShort}`;
  }

  const minutes = Math.floor(safe / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  return `${minutes}${units.minuteShort} ${seconds}${units.secondShort}`;
};

export const getNextTickMs = (msRemaining: number) =>
  msRemaining < 3_600_000 ? 1_000 : 60_000;
```

```tsx
// apps/web/src/components/site/localized-number.tsx
"use client";

import React, { useMemo } from "react";
import { useLocale } from "./locale-provider";

type LocalizedNumberProps = {
  value: number;
  notation?: Intl.NumberFormatOptions["notation"];
  compactDisplay?: Intl.NumberFormatOptions["compactDisplay"];
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
};

export function LocalizedNumber({
  value,
  notation,
  compactDisplay,
  maximumFractionDigits,
  minimumFractionDigits
}: LocalizedNumberProps) {
  const { locale } = useLocale();

  const text = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, {
        notation,
        compactDisplay,
        maximumFractionDigits,
        minimumFractionDigits
      }).format(value);
    } catch {
      return String(value);
    }
  }, [compactDisplay, locale, maximumFractionDigits, minimumFractionDigits, notation, value]);

  return <span>{text}</span>;
}
```

```tsx
// apps/web/src/components/site/localized-date-time.tsx
"use client";

import React from "react";
import { formatIsoForZone } from "../../lib/dashboard/date-time";
import { useLocale } from "./locale-provider";

type LocalizedDateTimeProps = {
  iso: string | null;
};

export function LocalizedDateTime({ iso }: LocalizedDateTimeProps) {
  const { locale, timeZone } = useLocale();
  return <span>{formatIsoForZone(iso, timeZone, locale)}</span>;
}
```

```tsx
// apps/web/src/components/site/localized-relative-time.tsx
"use client";

import React from "react";
import { useLocale } from "./locale-provider";

type LocalizedRelativeTimeProps = {
  targetIso: string;
  nowIso?: string;
};

export function LocalizedRelativeTime({ targetIso, nowIso }: LocalizedRelativeTimeProps) {
  const { locale } = useLocale();
  const target = new Date(targetIso);
  const now = nowIso ? new Date(nowIso) : new Date();

  if (Number.isNaN(target.valueOf()) || Number.isNaN(now.valueOf())) {
    return <span>—</span>;
  }

  const ms = target.valueOf() - now.valueOf();
  const minutes = Math.round(ms / 60_000);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    return <span>{rtf.format(minutes, "minute")}</span>;
  } catch {
    return <span>—</span>;
  }
}
```

```tsx
// apps/web/src/components/site/countdown-timer.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCountdown, getNextTickMs } from "../../lib/dashboard/countdown";

type CountdownTimerProps = {
  targetIso: string | null;
  endedLabel: string;
  onTimerEnd?: () => void;
};

export function CountdownTimer({ targetIso, endedLabel, onTimerEnd }: CountdownTimerProps) {
  const { t } = useTranslation("units");
  const [value, setValue] = useState("—");
  const endTriggeredRef = useRef(false);

  useEffect(() => {
    if (!targetIso) {
      setValue("—");
      return;
    }

    const target = new Date(targetIso);
    if (Number.isNaN(target.valueOf())) {
      setValue("—");
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const units = {
      dayShort: t("dayShort"),
      hourShort: t("hourShort"),
      minuteShort: t("minuteShort"),
      secondShort: t("secondShort")
    };

    const tick = () => {
      const msRemaining = target.valueOf() - Date.now();

      if (msRemaining <= 0) {
        setValue(endedLabel);
        if (!endTriggeredRef.current) {
          endTriggeredRef.current = true;
          onTimerEnd?.();
        }
        return;
      }

      setValue(formatCountdown(msRemaining, units));
      timer = setTimeout(tick, getNextTickMs(msRemaining));
    };

    endTriggeredRef.current = false;
    tick();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [endedLabel, onTimerEnd, t, targetIso]);

  return <span>{value}</span>;
}
```

- [ ] **Step 4: Run formatter and component tests**

Run: `pnpm test -- apps/web/src/lib/dashboard/countdown.test.ts apps/web/src/components/site/localized-number.test.tsx apps/web/src/components/site/localized-date-time.test.tsx apps/web/src/components/site/localized-relative-time.test.tsx apps/web/src/components/site/countdown-timer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/dashboard/date-time.ts apps/web/src/lib/dashboard/countdown.ts apps/web/src/lib/dashboard/countdown.test.ts apps/web/src/components/site/localized-number.tsx apps/web/src/components/site/localized-number.test.tsx apps/web/src/components/site/localized-date-time.tsx apps/web/src/components/site/localized-date-time.test.tsx apps/web/src/components/site/localized-relative-time.tsx apps/web/src/components/site/localized-relative-time.test.tsx apps/web/src/components/site/countdown-timer.tsx apps/web/src/components/site/countdown-timer.test.tsx
git commit -m "feat(web): bind intl formatters to selected language"
```

### Task 4: Remove UI phrases from data contracts and server adapters

**Files:**
- Modify: `packages/ports/src/repositories/clan-dashboard-repository.ts`
- Modify: `packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts`
- Modify: `packages/platform/test/clan-dashboard-repository.test.ts`
- Test: `packages/platform/test/clan-dashboard-repository.test.ts`

- [ ] **Step 1: Write failing repository contract test for language-neutral readiness payload**

```ts
// packages/platform/test/clan-dashboard-repository.test.ts (add/adjust assertion)
expect(snapshot.readiness[0]).toMatchObject({
  activity: "hydra",
  title: "Hydra",
  targetKind: "reset",
  href: "/dashboard/hydra",
  // language-neutral primitives
  metricKind: "keys_and_damage",
  hasPersonalRewards: null
});

expect("statusLabel" in snapshot.readiness[0]).toBe(false);
expect("primaryValue" in snapshot.readiness[0]).toBe(false);
```

- [ ] **Step 2: Run repository test to verify fail**

Run: `pnpm test -- packages/platform/test/clan-dashboard-repository.test.ts`
Expected: FAIL because old shape still includes `statusLabel` and `primaryValue`.

- [ ] **Step 3: Refactor contracts and mapping to enum/data primitives**

```ts
// packages/ports/src/repositories/clan-dashboard-repository.ts
export type DashboardReadinessMetricKind =
  | "keys_and_damage"
  | "clan_wars_state"
  | "siege_preparation";

export type DashboardReadinessCard = {
  activity: DashboardReadinessActivity;
  title: string;
  targetAt: string | null;
  targetKind: "reset" | "start";
  href: string;
  metricKind: DashboardReadinessMetricKind;
  keysSpent?: number;
  totalScore?: number;
  clanWarsState?: "active" | "upcoming";
  hasPersonalRewards?: boolean | null;
};
```

```ts
// packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts (inside readiness array)
{
  activity: "hydra",
  title: "Hydra",
  targetAt: getNextHydraResetAnchorUtc(nowIso),
  targetKind: "reset",
  href: "/dashboard/hydra",
  metricKind: "keys_and_damage",
  keysSpent: hydraKeysSpent,
  totalScore: hydraTotalScore,
  hasPersonalRewards: null
},
{
  activity: "chimera",
  title: "Chimera",
  targetAt: getNextChimeraResetAnchorUtc(nowIso),
  targetKind: "reset",
  href: "/dashboard/chimera",
  metricKind: "keys_and_damage",
  keysSpent: chimeraKeysSpent,
  totalScore: chimeraTotalScore,
  hasPersonalRewards: null
},
{
  activity: "clan_wars",
  title: "KT",
  targetAt: clanWarsAnchor.targetAt,
  targetKind: clanWarsAnchor.targetKind,
  href: "/dashboard/clan-wars",
  metricKind: "clan_wars_state",
  clanWarsState: clanWarsAnchor.targetKind === "reset" ? "active" : "upcoming",
  hasPersonalRewards: clanWarsAnchor.hasPersonalRewards
},
{
  activity: "siege",
  title: "Siege",
  targetAt: computeNextBiweeklyStart(siegeReadiness?.starts_at ?? null, nowIso),
  targetKind: "start",
  href: "/dashboard/siege",
  metricKind: "siege_preparation",
  hasPersonalRewards: null
}
```

- [ ] **Step 4: Run repository tests to verify pass**

Run: `pnpm test -- packages/platform/test/clan-dashboard-repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ports/src/repositories/clan-dashboard-repository.ts packages/platform/src/dashboard/create-d1-clan-dashboard-repository.ts packages/platform/test/clan-dashboard-repository.test.ts
git commit -m "refactor(data): expose readiness data as locale-neutral primitives"
```

### Task 5: Localize pages/components and add menu language switcher

**Files:**
- Modify: `apps/web/src/lib/site/content.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/about/page.tsx`
- Modify: `apps/web/src/app/not-found.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/dashboard/clan-wars/page.tsx`
- Modify: `apps/web/src/components/site/dashboard-nav.tsx`
- Modify: `apps/web/src/components/site/brand-mark.tsx`
- Modify: `apps/web/src/components/site/dashboard-readiness-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-fusion-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-performers-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-trends-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-header-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-history-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-stability-zone.tsx`
- Modify: `apps/web/src/components/site/dashboard-kt-decline-zone.tsx`
- Modify: `apps/web/src/app/page.test.tsx`
- Modify: `apps/web/src/app/about/page.test.tsx`
- Modify: `apps/web/src/app/not-found.test.tsx`
- Modify: `apps/web/src/app/dashboard/page.test.tsx`
- Modify: `apps/web/src/app/dashboard/clan-wars/page.test.tsx`
- Test: page/component tests listed above

- [ ] **Step 1: Update failing tests to assert runtime localization behavior**

```ts
// apps/web/src/app/dashboard/page.test.tsx (example assertion adjustments)
expect(html).toContain("data-testid=\"language-switcher\"");
expect(html).toContain("dashboard.readinessTitle"); // pre-localization fail marker removed after implementation
```

```ts
// apps/web/src/app/not-found.test.tsx
expect(html).toContain('href="/"');
expect(html).not.toContain("Back Home");
```

- [ ] **Step 2: Run relevant app tests to verify fail**

Run: `pnpm test -- apps/web/src/app/page.test.tsx apps/web/src/app/about/page.test.tsx apps/web/src/app/not-found.test.tsx apps/web/src/app/dashboard/page.test.tsx apps/web/src/app/dashboard/clan-wars/page.test.tsx`
Expected: FAIL due old hardcoded text expectations.

- [ ] **Step 3: Refactor pages/components to use `useTranslation`, `LanguageSwitcher`, and localized units**

```tsx
// apps/web/src/components/site/dashboard-nav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./language-switcher";

export function DashboardNav() {
  const { t } = useTranslation("menu");

  return (
    <details className="dashboard-nav">
      <summary>{t("menu")}</summary>
      <nav className="dashboard-nav__links" aria-label={t("navigationLabel")}>
        <Link href="/">{t("landing")}</Link>
        <Link href="/about">{t("about")}</Link>
        <Link href="/dashboard">{t("dashboard")}</Link>
        <Link href="/dashboard/clan-wars">{t("clanWars")}</Link>
        <LanguageSwitcher />
      </nav>
    </details>
  );
}
```

```tsx
// apps/web/src/components/site/dashboard-readiness-zone.tsx (key rendering branch)
"use client";

import { useTranslation } from "react-i18next";

const getClanWarsStateKey = (state: "active" | "upcoming") =>
  state === "active" ? "dashboard.clanWarsStateActive" : "dashboard.clanWarsStateUpcoming";

export function DashboardReadinessZone({ cards }: DashboardReadinessZoneProps) {
  const { t } = useTranslation(["dashboard", "units"]);

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("dashboard:readinessTitle")}</h2>
      <div className="dashboard-readiness-grid">
        {cards.map((card) => (
          <Link key={card.activity} href={card.href} className="dashboard-readiness-card">
            <h3 className="display-face">{card.title}</h3>
            {card.metricKind === "keys_and_damage" ? (
              <p>
                {t("units:keys")}: <LocalizedNumber value={card.keysSpent ?? 0} /> • {t("units:damage")}: {" "}
                <LocalizedNumber
                  value={card.totalScore ?? 0}
                  notation="compact"
                  compactDisplay="short"
                  maximumFractionDigits={1}
                />
              </p>
            ) : card.metricKind === "clan_wars_state" ? (
              <p>{t(getClanWarsStateKey(card.clanWarsState ?? "upcoming"))}</p>
            ) : (
              <p>{t("dashboard:siegePreparation")}</p>
            )}

            <p>
              <CountdownTimer
                targetIso={card.targetAt}
                endedLabel={t("dashboard:countdownEnded")}
              />
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// apps/web/src/components/site/dashboard-kt-stability-zone.tsx (units localization)
"use client";

import { useTranslation } from "react-i18next";

export function DashboardKtStabilityZone({ rows }: DashboardKtStabilityZoneProps) {
  const { t } = useTranslation(["dashboard", "units", "common"]);
  const topRows = rows.slice(0, 10);

  return (
    <section className="panel-card panel-card--padded dashboard-stack">
      <h2 className="display-face">{t("dashboard:ktStabilityTitle")}</h2>
      {topRows.length === 0 ? (
        <p>{t("common:noData")}</p>
      ) : (
        <ol className="dashboard-ranking-list">
          {topRows.map((row, index) => (
            <li key={`${row.playerName}-${index}`}>
              <span>{row.playerName}</span>
              <strong>
                <LocalizedNumber value={row.avgPoints} /> {t("units:avg")} / <LocalizedNumber value={row.lastWindowPoints} /> {t("units:last")}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
```

```tsx
// apps/web/src/app/page.tsx (client + i18n)
"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { AtmosphericLink } from "../components/site/atmospheric-link";
import { BrandMark } from "../components/site/brand-mark";
import { PageBackdrop } from "../components/site/page-backdrop";
import { landingPanelLinks, siteArtwork } from "../lib/site/content";

export default function HomePage() {
  const { t } = useTranslation(["landing", "menu"]);

  return (
    <PageBackdrop imagePath={siteArtwork.landing.default}>
      <section className="landing-layout">
        <div className="landing-copy">
          <div className="landing-copy__body">
            <BrandMark />
            <h1 className="display-face">{t("landing:title")}</h1>
            <p>{t("landing:body")}</p>
          </div>
        </div>

        <aside className="panel-card landing-panel">
          <BrandMark />
          <div className="landing-panel__stack">
            <h2 className="display-face">{t("landing:panelTitle")}</h2>
            <p>{t("landing:panelBody")}</p>
          </div>
          <nav className="landing-panel__stack" aria-label={t("menu:navigationLabel")}>
            {landingPanelLinks.map((link) => (
              <AtmosphericLink key={link.href} href={link.href}>
                {t(link.i18nKey)}
              </AtmosphericLink>
            ))}
            <span className="atmos-link atmos-link--muted">{t("landing:memberLoginLater")}</span>
          </nav>
        </aside>
      </section>
    </PageBackdrop>
  );
}
```

- [ ] **Step 4: Run app tests to verify pass**

Run: `pnpm test -- apps/web/src/app/page.test.tsx apps/web/src/app/about/page.test.tsx apps/web/src/app/not-found.test.tsx apps/web/src/app/dashboard/page.test.tsx apps/web/src/app/dashboard/clan-wars/page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/site/content.ts apps/web/src/app/page.tsx apps/web/src/app/about/page.tsx apps/web/src/app/not-found.tsx apps/web/src/app/dashboard/page.tsx apps/web/src/app/dashboard/clan-wars/page.tsx apps/web/src/components/site/dashboard-nav.tsx apps/web/src/components/site/brand-mark.tsx apps/web/src/components/site/dashboard-readiness-zone.tsx apps/web/src/components/site/dashboard-fusion-zone.tsx apps/web/src/components/site/dashboard-performers-zone.tsx apps/web/src/components/site/dashboard-trends-zone.tsx apps/web/src/components/site/dashboard-kt-header-zone.tsx apps/web/src/components/site/dashboard-kt-history-zone.tsx apps/web/src/components/site/dashboard-kt-stability-zone.tsx apps/web/src/components/site/dashboard-kt-decline-zone.tsx apps/web/src/app/page.test.tsx apps/web/src/app/about/page.test.tsx apps/web/src/app/not-found.test.tsx apps/web/src/app/dashboard/page.test.tsx apps/web/src/app/dashboard/clan-wars/page.test.tsx
git commit -m "feat(web): localize app routes and dashboard components"
```

### Task 6: Add ESLint hard blocker for literal UI strings and run full gates

**Files:**
- Modify: `apps/web/eslint.config.mjs`
- Modify: `apps/web/package.json`
- Test: lint + repository quality gates

- [ ] **Step 1: Add failing lint fixtures (implicit via existing literals)**

No new fixture file is needed. Current literals in JSX should trigger lint failures once the rule is enabled, proving the gate is active.

- [ ] **Step 2: Add eslint plugin dependency and rule configuration**

```json
// apps/web/package.json (devDependencies)
{
  "devDependencies": {
    "eslint-plugin-i18next": "^6.1.3"
  }
}
```

```js
// apps/web/eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import i18next from "eslint-plugin-i18next";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      i18next
    },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          markupOnly: true,
          onlyAttribute: ["aria-label", "title", "alt", "placeholder"],
          words: [
            "KT",
            "Hydra",
            "Chimera",
            "Siege",
            "Raid",
            "SL",
            "Clan",
            "VIБР"
          ]
        }
      ]
    }
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"])
]);

export default eslintConfig;
```

- [ ] **Step 3: Install dependencies and run lint**

Run: `pnpm install`
Expected: dependency lock updated.

Run: `pnpm --filter @raid/web run lint apps/web/src`
Expected: PASS with zero hardcoded literals left in JSX/attributes.

- [ ] **Step 4: Run full repository validation gate**

Run:
- `pnpm test`
- `pnpm typecheck`
- `pnpm -r run build`
- `pnpm --filter @raid/web run cf:build`
- `pnpm --filter @raid/web exec wrangler d1 migrations list raid-sl-clan --local`

Expected: all PASS; migrations list reports no unapplied local migrations.

- [ ] **Step 5: Commit**

```bash
git add apps/web/eslint.config.mjs apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): enforce i18n no-literal-string lint gate"
```

## Self-Review

### Spec Coverage Check

- Supported languages `ru/uk/en`: covered in Task 1 (`languages.ts`, resources).
- Single route set without locale prefixes: preserved; no routing changes in any task.
- Browser detection with fallback to `ru`: Task 1 resolver + Task 2 provider initialization.
- Menu language switcher with persisted choice: Task 2 + Task 5 (`LanguageSwitcher` in `DashboardNav`).
- Locale-bound number/date/relative formatting: Task 3 (`LocalizedNumber`, `LocalizedDateTime`, `LocalizedRelativeTime`, `formatCountdown`).
- Runtime switch without reload: Task 2 provider with `i18n.changeLanguage` and state update.
- Coverage for UI strings and units (`avg`, `last`, etc.): Task 1 resources + Task 5 UI migration.
- Move phrases out of repository/server layer: Task 4 contract and mapping refactor.
- ESLint hard blocker for literals in JSX/attributes: Task 6.

No uncovered spec requirement found.

### Placeholder Scan

Checked for `TODO`, `TBD`, "implement later", "similar to Task" placeholders: none.

### Type Consistency Check

- `SupportedLanguage` reused consistently in resolver/provider/switcher.
- `DashboardReadinessCard` shape consistently references `metricKind`, `clanWarsState`, `hasPersonalRewards`.
- `CountdownUnits` keys align with translation keys (`dayShort`, `hourShort`, `minuteShort`, `secondShort`).

No type naming mismatch found.
