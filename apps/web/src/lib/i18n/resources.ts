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
