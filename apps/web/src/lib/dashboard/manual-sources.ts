import fusionJson from "../../data/dashboard/fusion-current-event.json";
import siegeJson from "../../data/dashboard/siege-defense-manual.json";
import type {
  DashboardRankingRow,
  DashboardTopBottom,
  FusionEvent,
  FusionEventSource,
  SiegeDefenseSource
} from "@raid/ports";

const defaultFusionEvent: FusionEvent = {
  status: "idle",
  title: null,
  startsAt: null,
  endsAt: null,
  heroPortraitImageUrl: null,
  calendarImageUrl: null,
  note: "Слияния сейчас нет"
};

const isNullableString = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

const isFusionStatus = (value: unknown): value is FusionEvent["status"] =>
  value === "active" || value === "idle";

const isFusionEvent = (value: unknown): value is FusionEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    isFusionStatus(entry.status) &&
    isNullableString(entry.title) &&
    isNullableString(entry.startsAt) &&
    isNullableString(entry.endsAt) &&
    isNullableString(entry.heroPortraitImageUrl) &&
    isNullableString(entry.calendarImageUrl) &&
    isNullableString(entry.note)
  );
};

const isRankingRow = (value: unknown): value is DashboardRankingRow => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;
  return typeof row.playerName === "string" && typeof row.score === "number";
};

const isTopBottom = (value: unknown): value is DashboardTopBottom => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const shape = value as Record<string, unknown>;

  if (!Array.isArray(shape.top5) || !Array.isArray(shape.bottom5)) {
    return false;
  }

  return shape.top5.every(isRankingRow) && shape.bottom5.every(isRankingRow);
};

export const fusionEventSource: FusionEventSource = {
  getCurrentFusionEvent() {
    if (!isFusionEvent(fusionJson)) {
      return defaultFusionEvent;
    }

    return fusionJson;
  }
};

export const siegeDefenseSource: SiegeDefenseSource = {
  getCurrentRanking() {
    if (!isTopBottom(siegeJson)) {
      return {
        top5: [],
        bottom5: []
      };
    }

    return siegeJson;
  }
};
