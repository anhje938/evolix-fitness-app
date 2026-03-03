import {
  type HomeGoalTile,
  type HomeSectionKey,
  type RecoveryMapMuscleKey,
  type UserSettings,
} from "@/types/userSettings";
import { ADVANCED_MUSCLE_FILTERS } from "@/types/muscles";
import { API_BASE_URL } from "./baseUrl";

const USER_SETTINGS_PATH = "user/me/settings";
const ALLOWED_TILES: HomeGoalTile[] = ["calories", "protein", "carbs", "fat"];
const ALLOWED_HOME_SECTIONS: HomeSectionKey[] = [
  "quickStart",
  "goals",
  "weight",
  "recoveryMap",
];
const ALLOWED_RECOVERY_MUSCLES: RecoveryMapMuscleKey[] = ADVANCED_MUSCLE_FILTERS.filter(
  (item) => item.value !== "ALL"
).map((item) => item.value as RecoveryMapMuscleKey);
const FALLBACK_SETTINGS: UserSettings = {
  calorieGoal: 2500,
  proteinGoal: 180,
  fatGoal: 70,
  carbGoal: 220,
  showOnlyCustomTrainingContent: false,
  muscleFilter: "advanced",
  recoveryMapHiddenMuscles: [],
  homeGoalTiles: ["calories", "protein", "carbs", "fat"],
  homeSectionOrder: ["quickStart", "goals", "weight", "recoveryMap"],
  weightGoalKg: 84,
  weightDirection: "maintain",
};

type BackendEnum = string | number | null | undefined;
type BackendSettingsResponse = Partial<UserSettings> & {
  homeProgressCircles?: unknown;
  homeProgressCirclesJson?: unknown;
  homeSectionOrder?: unknown;
  recoveryMapHiddenMuscles?: unknown;
  showOnlyCustomTrainingContent?: unknown;
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
  showOnlyCustomTrainingContent: boolean;
  homeProgressCircles: HomeGoalTile[];
  homeSectionOrder: HomeSectionKey[];
  recoveryMapHiddenMuscles: RecoveryMapMuscleKey[];
  homeProgressCirclesJson: string;
};

function toSafeInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
  }
  return fallback;
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

function normalizeHomeSectionOrder(value: unknown): HomeSectionKey[] {
  if (!Array.isArray(value)) return [...FALLBACK_SETTINGS.homeSectionOrder];

  const seen = new Set<HomeSectionKey>();
  const next: HomeSectionKey[] = [];

  for (const raw of value) {
    if (typeof raw !== "string") continue;
    if (!ALLOWED_HOME_SECTIONS.includes(raw as HomeSectionKey)) continue;
    const section = raw as HomeSectionKey;
    if (seen.has(section)) continue;
    seen.add(section);
    next.push(section);
  }

  if (next.length !== ALLOWED_HOME_SECTIONS.length) {
    for (const section of ALLOWED_HOME_SECTIONS) {
      if (!seen.has(section)) next.push(section);
    }
  }

  return next;
}

function normalizeRecoveryMapHiddenMuscles(value: unknown): RecoveryMapMuscleKey[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<RecoveryMapMuscleKey>();
  const next: RecoveryMapMuscleKey[] = [];

  for (const raw of value) {
    if (typeof raw !== "string") continue;
    if (!ALLOWED_RECOVERY_MUSCLES.includes(raw as RecoveryMapMuscleKey)) continue;
    const muscle = raw as RecoveryMapMuscleKey;
    if (seen.has(muscle)) continue;
    seen.add(muscle);
    next.push(muscle);
  }

  return next;
}

function parseHomeUiJson(
  value: unknown
): {
  homeGoalTiles: HomeGoalTile[];
  homeSectionOrder: HomeSectionKey[];
  recoveryMapHiddenMuscles: RecoveryMapMuscleKey[];
  showOnlyCustomTrainingContent: boolean;
} | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return {
        homeGoalTiles: normalizeHomeGoalTiles(parsed),
        homeSectionOrder: [...FALLBACK_SETTINGS.homeSectionOrder],
        recoveryMapHiddenMuscles: [...FALLBACK_SETTINGS.recoveryMapHiddenMuscles],
        showOnlyCustomTrainingContent:
          FALLBACK_SETTINGS.showOnlyCustomTrainingContent,
      };
    }

    if (!parsed || typeof parsed !== "object") return null;

    const asObj = parsed as Record<string, unknown>;
    return {
      homeGoalTiles: normalizeHomeGoalTiles(
        asObj.homeProgressCircles ??
          asObj.homeGoalTiles ??
          asObj.HomeProgressCircles ??
          asObj.HomeGoalTiles
      ),
      homeSectionOrder: normalizeHomeSectionOrder(
        asObj.homeSectionOrder ?? asObj.HomeSectionOrder
      ),
      recoveryMapHiddenMuscles: normalizeRecoveryMapHiddenMuscles(
        asObj.recoveryMapHiddenMuscles ?? asObj.RecoveryMapHiddenMuscles
      ),
      showOnlyCustomTrainingContent: normalizeBoolean(
        asObj.showOnlyCustomTrainingContent ??
          asObj.ShowOnlyCustomTrainingContent,
        FALLBACK_SETTINGS.showOnlyCustomTrainingContent
      ),
    };
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
  const homeUiFromJson = parseHomeUiJson(src.homeProgressCirclesJson);
  const hasHomeSectionOrder = src.homeSectionOrder !== undefined;
  const hasRecoveryMapHiddenMuscles = src.recoveryMapHiddenMuscles !== undefined;
  const hasShowOnlyCustomTrainingContent =
    src.showOnlyCustomTrainingContent !== undefined;

  return {
    calorieGoal: toSafeInt(src.calorieGoal, FALLBACK_SETTINGS.calorieGoal),
    proteinGoal: toSafeInt(src.proteinGoal, FALLBACK_SETTINGS.proteinGoal),
    fatGoal: toSafeInt(src.fatGoal, FALLBACK_SETTINGS.fatGoal),
    carbGoal: toSafeInt(src.carbGoal, FALLBACK_SETTINGS.carbGoal),
    muscleFilter: normalizeMuscleFilter(src.muscleFilter),
    recoveryMapHiddenMuscles: hasRecoveryMapHiddenMuscles
      ? normalizeRecoveryMapHiddenMuscles(src.recoveryMapHiddenMuscles)
      : homeUiFromJson
      ? homeUiFromJson.recoveryMapHiddenMuscles
      : [...FALLBACK_SETTINGS.recoveryMapHiddenMuscles],
    showOnlyCustomTrainingContent: hasShowOnlyCustomTrainingContent
      ? normalizeBoolean(
          src.showOnlyCustomTrainingContent,
          FALLBACK_SETTINGS.showOnlyCustomTrainingContent
        )
      : homeUiFromJson
      ? homeUiFromJson.showOnlyCustomTrainingContent
      : FALLBACK_SETTINGS.showOnlyCustomTrainingContent,
    homeGoalTiles: homeUiFromJson
      ? homeUiFromJson.homeGoalTiles
      : normalizeHomeGoalTiles(
          src.homeProgressCircles ?? src.homeGoalTiles
        ),
    homeSectionOrder: hasHomeSectionOrder
      ? normalizeHomeSectionOrder(src.homeSectionOrder)
      : homeUiFromJson
      ? homeUiFromJson.homeSectionOrder
      : [...FALLBACK_SETTINGS.homeSectionOrder],
    weightGoalKg: toSafeInt(src.weightGoalKg, FALLBACK_SETTINGS.weightGoalKg),
    weightDirection: normalizeWeightDirection(src.weightDirection),
  };
}

function toBackendDto(settings: UserSettings): UpdateUserSettingsDto {
  const normalizedHiddenMuscles = normalizeRecoveryMapHiddenMuscles(
    settings.recoveryMapHiddenMuscles
  );

  return {
    calorieGoal: toSafeInt(settings.calorieGoal, FALLBACK_SETTINGS.calorieGoal),
    proteinGoal: toSafeInt(settings.proteinGoal, FALLBACK_SETTINGS.proteinGoal),
    fatGoal: toSafeInt(settings.fatGoal, FALLBACK_SETTINGS.fatGoal),
    carbGoal: toSafeInt(settings.carbGoal, FALLBACK_SETTINGS.carbGoal),
    weightGoalKg: Number(settings.weightGoalKg ?? FALLBACK_SETTINGS.weightGoalKg),
    weightDirection: toBackendWeightDirection(settings.weightDirection),
    muscleFilter: toBackendMuscleFilter(settings.muscleFilter),
    showOnlyCustomTrainingContent: normalizeBoolean(
      settings.showOnlyCustomTrainingContent,
      FALLBACK_SETTINGS.showOnlyCustomTrainingContent
    ),
    homeProgressCircles: normalizeHomeGoalTiles(settings.homeGoalTiles),
    homeSectionOrder: normalizeHomeSectionOrder(settings.homeSectionOrder),
    recoveryMapHiddenMuscles: normalizedHiddenMuscles,
    homeProgressCirclesJson: JSON.stringify(
      normalizeHomeGoalTiles(settings.homeGoalTiles)
    ),
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
