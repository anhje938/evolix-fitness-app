import {
  type HomeGoalTile,
  type UserSettings,
} from "@/types/userSettings";
import { API_BASE_URL } from "./baseUrl";

const USER_SETTINGS_PATH = "user/me/settings";
const ALLOWED_TILES: HomeGoalTile[] = ["calories", "protein", "carbs", "fat"];
const FALLBACK_SETTINGS: UserSettings = {
  calorieGoal: 2500,
  proteinGoal: 180,
  fatGoal: 70,
  carbGoal: 220,
  muscleFilter: "advanced",
  homeGoalTiles: ["calories", "protein", "carbs", "fat"],
  weightGoalKg: 84,
  weightDirection: "maintain",
};

type BackendEnum = string | number | null | undefined;
type BackendSettingsResponse = Partial<UserSettings> & {
  homeProgressCircles?: unknown;
  homeProgressCirclesJson?: unknown;
  weightDirection?: BackendEnum;
  muscleFilter?: BackendEnum;
};

type UpdateUserSettingsDto = {
  calorieGoal: number;
  proteinGoal: number;
  fatGoal: number;
  carbGoal: number;
  weightGoalKg: number;
  weightDirection: 0 | 1 | 2;
  muscleFilter: 0 | 1;
  homeProgressCircles: HomeGoalTile[];
};

function toSafeInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function normalizeHomeGoalTiles(value: unknown): HomeGoalTile[] {
  if (!Array.isArray(value)) return [...FALLBACK_SETTINGS.homeGoalTiles];

  const seen = new Set<HomeGoalTile>();
  const next: HomeGoalTile[] = [];

  for (const raw of value) {
    if (typeof raw !== "string") continue;
    if (!ALLOWED_TILES.includes(raw as HomeGoalTile)) continue;
    const tile = raw as HomeGoalTile;
    if (seen.has(tile)) continue;
    seen.add(tile);
    next.push(tile);
  }

  return next.length > 0 ? next : [...FALLBACK_SETTINGS.homeGoalTiles];
}

function parseTileJson(value: unknown): HomeGoalTile[] | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    return normalizeHomeGoalTiles(parsed);
  } catch {
    return null;
  }
}

function normalizeMuscleFilter(value: BackendEnum): "basic" | "advanced" {
  if (value === 0 || String(value).toLowerCase() === "basic") return "basic";
  return "advanced";
}

function normalizeWeightDirection(
  value: BackendEnum
): UserSettings["weightDirection"] {
  if (value === 0 || String(value).toLowerCase() === "lose") return "lose";
  if (value === 1 || String(value).toLowerCase() === "maintain") {
    return "maintain";
  }
  if (value === 2 || String(value).toLowerCase() === "gain") return "gain";
  return FALLBACK_SETTINGS.weightDirection;
}

function toBackendWeightDirection(
  value: UserSettings["weightDirection"]
): 0 | 1 | 2 {
  if (value === "lose") return 0;
  if (value === "gain") return 2;
  return 1;
}

function toBackendMuscleFilter(value: UserSettings["muscleFilter"]): 0 | 1 {
  return value === "basic" ? 0 : 1;
}

function normalizeUserSettings(raw?: BackendSettingsResponse | null): UserSettings {
  const src = raw ?? {};
  const tilesFromJson = parseTileJson(src.homeProgressCirclesJson);

  return {
    calorieGoal: toSafeInt(src.calorieGoal, FALLBACK_SETTINGS.calorieGoal),
    proteinGoal: toSafeInt(src.proteinGoal, FALLBACK_SETTINGS.proteinGoal),
    fatGoal: toSafeInt(src.fatGoal, FALLBACK_SETTINGS.fatGoal),
    carbGoal: toSafeInt(src.carbGoal, FALLBACK_SETTINGS.carbGoal),
    muscleFilter: normalizeMuscleFilter(src.muscleFilter),
    homeGoalTiles: tilesFromJson
      ? tilesFromJson
      : normalizeHomeGoalTiles(
          src.homeProgressCircles ?? src.homeGoalTiles
        ),
    weightGoalKg: toSafeInt(src.weightGoalKg, FALLBACK_SETTINGS.weightGoalKg),
    weightDirection: normalizeWeightDirection(src.weightDirection),
  };
}

function toBackendDto(settings: UserSettings): UpdateUserSettingsDto {
  return {
    calorieGoal: toSafeInt(settings.calorieGoal, FALLBACK_SETTINGS.calorieGoal),
    proteinGoal: toSafeInt(settings.proteinGoal, FALLBACK_SETTINGS.proteinGoal),
    fatGoal: toSafeInt(settings.fatGoal, FALLBACK_SETTINGS.fatGoal),
    carbGoal: toSafeInt(settings.carbGoal, FALLBACK_SETTINGS.carbGoal),
    weightGoalKg: Number(settings.weightGoalKg ?? FALLBACK_SETTINGS.weightGoalKg),
    weightDirection: toBackendWeightDirection(settings.weightDirection),
    muscleFilter: toBackendMuscleFilter(settings.muscleFilter),
    homeProgressCircles: normalizeHomeGoalTiles(settings.homeGoalTiles),
  };
}

function buildError(status: number, body: string) {
  return new Error(body || `User settings request failed with status ${status}`);
}

export async function fetchUserSettings(token: string): Promise<UserSettings | null> {
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/${USER_SETTINGS_PATH}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 404 || res.status === 405) return null;
  const text = await res.text().catch(() => "");
  if (!res.ok) throw buildError(res.status, text);
  if (!text.trim()) return null;

  try {
    return normalizeUserSettings(JSON.parse(text) as BackendSettingsResponse);
  } catch {
    throw new Error("Server returned invalid JSON for user settings");
  }
}

export async function upsertUserSettings(
  token: string,
  settings: UserSettings
): Promise<UserSettings> {
  if (!token) throw new Error("Missing token");

  const payload = normalizeUserSettings(settings);
  const res = await fetch(`${API_BASE_URL}/${USER_SETTINGS_PATH}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(toBackendDto(payload)),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw buildError(res.status, text);
  if (!text.trim()) return payload;

  try {
    return normalizeUserSettings(JSON.parse(text) as BackendSettingsResponse);
  } catch {
    return payload;
  }
}
