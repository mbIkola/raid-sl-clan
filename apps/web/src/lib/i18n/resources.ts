import type { Resource } from "i18next";

export const i18nResources: Resource = {
  ru: {
    common: {
      appName: "Raid SL Clan",
      menu: "Меню",
      loading: "Загрузка",
      noData: "Недостаточно данных",
      backToLanding: "Назад на главную",
      backHome: "Назад на главную",
      primaryNavigation: "Основная навигация",
      notFoundMessage:
        "Тропа обрывается здесь. Вернись к публичному входу, пока не стало неловко."
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
      title: "О проекте",
      intro:
        "Это клановый дашборд для Raid Shadow Legends. Он появился, потому что собирать данные по скриншотам в Telegram и сводить всё в Excel — утомительно и ненадёжно. Здесь собрана базовая картина по клану в одном месте.",
      openDashboard: "Открыть дашборд",
      openGitHub: "GitHub",
      sections: {
        whatThisPlaceIs: {
          heading: "Зачем это нужно",
          body:
            "В Raid почти нет инструментов для клановой аналитики. Обычно всё держится на чатах, таблицах и ручном контроле. Этот проект упрощает базовые вещи: видно активность, результаты и общую дисциплину без лишних действий."
        },
        whatComesLater: {
          heading: "Что считается успехом",
          body:
            "Если участники клана открывают страницу и быстро понимают, кто выполнил активности, а кто нет, значит дашборд выполняет свою задачу. Проект будет развиваться, но его ценность определяется тем, насколько он полезен уже сейчас."
        },
        note: {
          heading: "Состояние проекта",
          body:
            "Проект развивается постепенно и может меняться. Некоторые функции могут быть упрощены или временно отсутствовать. Чего-то не хватает — welcome to contribute."
        }
      }
    },
    dashboard: {
      title: "Дашборд",
      clanWarsTitle: "KT",
      subtitle: "Мобильный дашборд клана на реальных данных.",
      archiveSubtitle: "Архивная телеметрия клановых турниров.",
      snapshotGenerated: "Снимок создан",
      readinessTitle: "Зона боеготовности",
      readinessEnded: "Окно завершено, идет подсчет результатов",
      readinessClanWarsActive: "Идет клановый турнир",
      readinessClanWarsUpcoming: "Подготовка к следующему окну",
      readinessSiegePreparation: "Подготовка к старту",
      readinessStatusWithRewards: "с личными наградами",
      readinessStatusWithoutRewards: "без личных наград",
      readinessStatusNextWindow: "Следующее окно",
      readinessStatusWindowReset: "Сброс окна",
      fusionTitle: "Зона слияния",
      fusionDefaultTitle: "Слияние",
      fusionPeriodLabel: "Период",
      fusionEnded: "Слияние закончено",
      fusionHeroAlt: "Герой слияния",
      fusionOpenCalendar: "Открыть календарь",
      performersTitle: "Зона топ перформеров",
      performersTop5: "Топ 5",
      performersBottom5: "Нижние 5",
      performersTopActivitySelector: "Выбор активности для топ-5",
      performersBottomActivitySelector: "Выбор активности для нижних 5",
      performersActivityHydra: "Hydra",
      performersActivityChimera: "Chimera",
      performersActivityClanWars: "KT",
      performersActivitySiegeDef: "Siege(def)",
      performersKtNote:
        "* Рейтинг KT считается как SUM(points) по последним 4 отчетам KT с личными наградами.",
      trendsTitle: "Зона трендов",
      trendsSubtitle: "Срез трендов клана за 8 недель.",
      trendsHydra: "Hydra",
      trendsChimera: "Chimera",
      ktArchiveTitle: "Клановый турнир: архив",
      ktHistoryTitle: "История окон КТ",
      ktStabilityTitle: "Стабильность состава",
      ktDeclineTitle: "Кто проседает",
      ktNoDeclines: "Просадок не найдено",
      ktCountdownToStart: "До старта следующего окна",
      ktCountdownToReset: "До сброса текущего окна",
      ktWindowEnded: "Окно завершено, ожидаем обновление",
      ktRewardsLabel: "Награды",
      ktRewardsWithPersonal: "С личными наградами",
      ktRewardsWithoutPersonal: "Без личных наград",
      ktWindowPeriodLabel: "Период окна",
      ktHistoryWindowColumn: "Окно",
      ktHistoryRewardsColumn: "Награды",
      ktHistoryClanPointsColumn: "Очки клана",
      ktHistoryActiveColumn: "Активные",
      ktHistoryTopColumn: "Top-1",
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
      backToLanding: "Назад на головну",
      backHome: "Назад на головну",
      primaryNavigation: "Основна навігація",
      notFoundMessage:
        "Стежка закінчується тут. Повернись до публічного входу, доки не стало незручно."
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
      openDashboard: "Відкрити дашборд",
      openGitHub: "GitHub",
      sections: {
        whatThisPlaceIs: {
          heading: "Що це за місце",
          body:
            "Публічний фронт клану: трохи архіву, трохи сигнального вогню і з часом точка входу, де новачки розуміють, куди рухатися далі."
        },
        whatComesLater: {
          heading: "Що буде далі",
          body:
            "Автентифікація, інструменти учасника й персональна статистика з’являться в наступних ітераціях. Ця сторінка лишається публічною та редакційною."
        },
        note: {
          heading: "Стан проєкту",
          body:
            "Проєкт розвивається поступово й може змінюватися. Частина функцій може бути спрощена або тимчасово недоступна."
        }
      }
    },
    dashboard: {
      title: "Дашборд",
      clanWarsTitle: "KT",
      subtitle: "Мобільний дашборд клану на реальних даних.",
      archiveSubtitle: "Архівна телеметрія кланових турнірів.",
      snapshotGenerated: "Знімок згенеровано",
      readinessTitle: "Зона бойової готовності",
      readinessEnded: "Вікно завершено, триває підрахунок результатів",
      readinessClanWarsActive: "Клановий турнір триває",
      readinessClanWarsUpcoming: "Підготовка до наступного вікна",
      readinessSiegePreparation: "Підготовка до старту",
      readinessStatusWithRewards: "з особистими нагородами",
      readinessStatusWithoutRewards: "без особистих нагород",
      readinessStatusNextWindow: "Наступне вікно",
      readinessStatusWindowReset: "Скидання вікна",
      fusionTitle: "Зона злиття",
      fusionDefaultTitle: "Злиття",
      fusionPeriodLabel: "Період",
      fusionEnded: "Злиття завершено",
      fusionHeroAlt: "Герой злиття",
      fusionOpenCalendar: "Відкрити календар",
      performersTitle: "Зона топ виконавців",
      performersTop5: "Топ 5",
      performersBottom5: "Нижні 5",
      performersTopActivitySelector: "Вибір активності для топ-5",
      performersBottomActivitySelector: "Вибір активності для нижніх 5",
      performersActivityHydra: "Hydra",
      performersActivityChimera: "Chimera",
      performersActivityClanWars: "KT",
      performersActivitySiegeDef: "Siege(def)",
      performersKtNote:
        "* Рейтинг KT обчислюється як SUM(points) за останні 4 звіти KT з особистими нагородами.",
      trendsTitle: "Зона трендів",
      trendsSubtitle: "Зріз кланових трендів за 8 тижнів.",
      trendsHydra: "Hydra",
      trendsChimera: "Chimera",
      ktArchiveTitle: "Клановий турнір: архів",
      ktHistoryTitle: "Історія вікон KT",
      ktStabilityTitle: "Стабільність складу",
      ktDeclineTitle: "Хто просідає",
      ktNoDeclines: "Просідань не знайдено",
      ktCountdownToStart: "До старту наступного вікна",
      ktCountdownToReset: "До скидання поточного вікна",
      ktWindowEnded: "Вікно завершено, очікуємо оновлення",
      ktRewardsLabel: "Нагороди",
      ktRewardsWithPersonal: "З особистими нагородами",
      ktRewardsWithoutPersonal: "Без особистих нагород",
      ktWindowPeriodLabel: "Період вікна",
      ktHistoryWindowColumn: "Вікно",
      ktHistoryRewardsColumn: "Нагороди",
      ktHistoryClanPointsColumn: "Очки клану",
      ktHistoryActiveColumn: "Активні",
      ktHistoryTopColumn: "Top-1",
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
      backToLanding: "Back to landing",
      backHome: "Back home",
      primaryNavigation: "Primary navigation",
      notFoundMessage:
        "The trail ends here. Return to the public front before it gets embarrassing."
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
      openDashboard: "Open dashboard",
      openGitHub: "GitHub",
      sections: {
        whatThisPlaceIs: {
          heading: "What This Place Is",
          body:
            "A public front for the clan: part archive, part signal fire, and eventually the place where new recruits figure out how not to get lost."
        },
        whatComesLater: {
          heading: "What Comes Later",
          body:
            "Authentication, member tools, and personal statistics arrive in later passes. This page stays public and editorial."
        },
        note: {
          heading: "Project Status",
          body:
            "The project is evolving in steps and can change over time. Some functions may stay simplified or temporarily unavailable."
        }
      }
    },
    dashboard: {
      title: "Dashboard",
      clanWarsTitle: "KT",
      subtitle: "Mobile-first clan dashboard grounded in real data.",
      archiveSubtitle: "Archive-first clan wars telemetry.",
      snapshotGenerated: "Snapshot generated",
      readinessTitle: "Readiness zone",
      readinessEnded: "Window ended, tally in progress",
      readinessClanWarsActive: "Clan wars active",
      readinessClanWarsUpcoming: "Preparing for the next window",
      readinessSiegePreparation: "Preparing for start",
      readinessStatusWithRewards: "with personal rewards",
      readinessStatusWithoutRewards: "without personal rewards",
      readinessStatusNextWindow: "Next window",
      readinessStatusWindowReset: "Window reset",
      fusionTitle: "Fusion zone",
      fusionDefaultTitle: "Fusion",
      fusionPeriodLabel: "Period",
      fusionEnded: "Fusion ended",
      fusionHeroAlt: "Fusion hero",
      fusionOpenCalendar: "Open calendar",
      performersTitle: "Top performers zone",
      performersTop5: "Top 5 performers",
      performersBottom5: "Bottom 5",
      performersTopActivitySelector: "Top performers activity selector",
      performersBottomActivitySelector: "Bottom performers activity selector",
      performersActivityHydra: "Hydra",
      performersActivityChimera: "Chimera",
      performersActivityClanWars: "KT",
      performersActivitySiegeDef: "Siege(def)",
      performersKtNote:
        "* KT ranking is calculated as SUM(points) over the latest 4 KT reports with personal rewards.",
      trendsTitle: "Trends zone",
      trendsSubtitle: "8-week clan trend snapshot.",
      trendsHydra: "Hydra",
      trendsChimera: "Chimera",
      ktArchiveTitle: "Clan wars: archive",
      ktHistoryTitle: "KT window history",
      ktStabilityTitle: "Roster stability",
      ktDeclineTitle: "Who is slipping",
      ktNoDeclines: "No decline detected",
      ktCountdownToStart: "Until the next window starts",
      ktCountdownToReset: "Until the current window reset",
      ktWindowEnded: "Window finished, waiting for refresh",
      ktRewardsLabel: "Rewards",
      ktRewardsWithPersonal: "With personal rewards",
      ktRewardsWithoutPersonal: "Without personal rewards",
      ktWindowPeriodLabel: "Window period",
      ktHistoryWindowColumn: "Window",
      ktHistoryRewardsColumn: "Rewards",
      ktHistoryClanPointsColumn: "Clan points",
      ktHistoryActiveColumn: "Active",
      ktHistoryTopColumn: "Top-1",
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
