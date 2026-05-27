import { fetchUserSettings, upsertUserSettings } from "@/api/userSettings";
import { useAuth } from "@/context/AuthProvider";
import type { UserSettings } from "@/types/userSettings";
import { isUnauthorizedError } from "@/utils/isUnauthorizedError";
import { getFutureUtcNoonIsoDate } from "@/utils/date";
import { setExpoGoCoachAnchorDate } from "@/api/authSession";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UserSettingsCtx = {
  userSettings: UserSettings;
  setUserSettings: (next: UserSettings) => void;
  saveUserSettingsNow: (
    next: UserSettings,
    options?: { requireRemoteSuccess?: boolean }
  ) => Promise<void>;
  refreshUserSettings: () => Promise<void>;
  isLoadingUserSettings: boolean;
  isSavingUserSettings: boolean;
  hasLoadedUserSettings: boolean;
  userSettingsError: string | null;
};

const KEY = "user_settings";
const SAVE_DEBOUNCE_MS = 700;
const INITIAL_USER_SETTINGS: UserSettings = {
  age: null,
  gender: null,
  language: "nb",
  hasCompletedRegistration: false,
  hasDismissedRegistrationOnboarding: false,
  calorieGoal: 2500,
  proteinGoal: 180,
  fatGoal: 70,
  carbGoal: 220,
  showOnlyCustomTrainingContent: false,
  muscleFilter: "advanced",
  recoveryMapHiddenMuscles: [],
  homeGoalTiles: ["calories", "protein", "carbs", "fat"],
  homeSectionOrder: ["quickStart", "goals", "weight", "recoveryMap"],
  useFoodCoach: true,
  useWorkoutCoach: true,
  foodCoachExcludedDateKeys: [],
  weightGoalKg: 84,
  weightGoalTimeUtc: getFutureUtcNoonIsoDate(84),
  cutStartDateUtc: null,
  cutStartWeightKg: null,
  weightDirection: "maintain",
  expoGoCoachAnchorDateUtc: null,
};

const Ctx = createContext<UserSettingsCtx | undefined>(undefined);

function mergeWithDefaults(raw: Partial<UserSettings>): UserSettings {
  return {
    ...INITIAL_USER_SETTINGS,
    ...raw,
    homeGoalTiles: Array.isArray(raw.homeGoalTiles)
      ? raw.homeGoalTiles
      : INITIAL_USER_SETTINGS.homeGoalTiles,
    homeSectionOrder: Array.isArray(raw.homeSectionOrder)
      ? raw.homeSectionOrder
      : INITIAL_USER_SETTINGS.homeSectionOrder,
    recoveryMapHiddenMuscles: Array.isArray(raw.recoveryMapHiddenMuscles)
      ? raw.recoveryMapHiddenMuscles
      : INITIAL_USER_SETTINGS.recoveryMapHiddenMuscles,
    foodCoachExcludedDateKeys: Array.isArray(raw.foodCoachExcludedDateKeys)
      ? raw.foodCoachExcludedDateKeys
      : INITIAL_USER_SETTINGS.foodCoachExcludedDateKeys,
    age: typeof raw.age === "number" ? raw.age : INITIAL_USER_SETTINGS.age,
    gender: raw.gender ?? INITIAL_USER_SETTINGS.gender,
    language: raw.language ?? INITIAL_USER_SETTINGS.language,
    hasCompletedRegistration:
      typeof raw.hasCompletedRegistration === "boolean"
        ? raw.hasCompletedRegistration
        : INITIAL_USER_SETTINGS.hasCompletedRegistration,
    hasDismissedRegistrationOnboarding:
      typeof raw.hasDismissedRegistrationOnboarding === "boolean"
        ? raw.hasDismissedRegistrationOnboarding
        : INITIAL_USER_SETTINGS.hasDismissedRegistrationOnboarding,
  };
}

function sameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function areSettingsEqual(a: UserSettings, b: UserSettings) {
  return (
    a.calorieGoal === b.calorieGoal &&
    a.age === b.age &&
    a.gender === b.gender &&
    a.language === b.language &&
    a.hasCompletedRegistration === b.hasCompletedRegistration &&
    a.hasDismissedRegistrationOnboarding ===
      b.hasDismissedRegistrationOnboarding &&
    a.proteinGoal === b.proteinGoal &&
    a.fatGoal === b.fatGoal &&
    a.carbGoal === b.carbGoal &&
    a.showOnlyCustomTrainingContent === b.showOnlyCustomTrainingContent &&
    a.useFoodCoach === b.useFoodCoach &&
    a.useWorkoutCoach === b.useWorkoutCoach &&
    sameStringArray(a.foodCoachExcludedDateKeys, b.foodCoachExcludedDateKeys) &&
    a.weightGoalKg === b.weightGoalKg &&
    a.weightGoalTimeUtc === b.weightGoalTimeUtc &&
    a.cutStartDateUtc === b.cutStartDateUtc &&
    a.cutStartWeightKg === b.cutStartWeightKg &&
    a.weightDirection === b.weightDirection &&
    a.expoGoCoachAnchorDateUtc === b.expoGoCoachAnchorDateUtc &&
    a.muscleFilter === b.muscleFilter &&
    sameStringArray(a.recoveryMapHiddenMuscles, b.recoveryMapHiddenMuscles) &&
    sameStringArray(a.homeGoalTiles, b.homeGoalTiles) &&
    sameStringArray(a.homeSectionOrder, b.homeSectionOrder)
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown settings error";
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { token, authReady, setToken } = useAuth();

  const [userSettings, setUserSettingsState] =
    useState<UserSettings>(INITIAL_USER_SETTINGS);
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const [isSavingUserSettings, setIsSavingUserSettings] = useState(false);
  const [hasLoadedUserSettings, setHasLoadedUserSettings] = useState(false);
  const [userSettingsError, setUserSettingsError] = useState<string | null>(
    null
  );

  const mountedRef = useRef(true);
  const queuedSaveRef = useRef<UserSettings | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expoGoCoachAnchorDateRef = useRef<string | null>(null);

  const persistLocal = useCallback(async (next: UserSettings) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (!mountedRef.current || !raw) return;

        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        const merged = mergeWithDefaults(parsed);
        expoGoCoachAnchorDateRef.current =
          merged.expoGoCoachAnchorDateUtc ?? null;
        setExpoGoCoachAnchorDate(merged.expoGoCoachAnchorDateUtc ?? null);
        setUserSettingsState((prev) =>
          areSettingsEqual(prev, merged) ? prev : merged
        );
      } catch {
        // Ignore invalid cache and keep defaults.
      }
    })();

    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  const refreshUserSettings = useCallback(async () => {
    if (!authReady) return;
    if (!token) {
      setHasLoadedUserSettings(true);
      return;
    }

    setIsLoadingUserSettings(true);
    setHasLoadedUserSettings(false);
    setUserSettingsError(null);

    try {
      const remote = await fetchUserSettings(token);
      if (!mountedRef.current || !remote) return;

      const localAnchor = expoGoCoachAnchorDateRef.current;
      const mergedRemote = {
        ...remote,
        expoGoCoachAnchorDateUtc: localAnchor,
      };

      setUserSettingsState((prev) => {
        return areSettingsEqual(prev, mergedRemote) ? prev : mergedRemote;
      });
      await persistLocal(mergedRemote);
    } catch (error) {
      if (!mountedRef.current) return;
      if (isUnauthorizedError(error)) {
        setUserSettingsError(null);
        void setToken(null);
        return;
      }
      setUserSettingsError(toErrorMessage(error));
    } finally {
      if (mountedRef.current) {
        setIsLoadingUserSettings(false);
        setHasLoadedUserSettings(true);
      }
    }
  }, [authReady, persistLocal, setToken, token]);

  useEffect(() => {
    void refreshUserSettings();
  }, [refreshUserSettings]);

  useEffect(() => {
    const value = userSettings.expoGoCoachAnchorDateUtc ?? null;
    expoGoCoachAnchorDateRef.current = value;
    setExpoGoCoachAnchorDate(value);
  }, [userSettings.expoGoCoachAnchorDateUtc]);

  const flushQueuedSave = useCallback(async () => {
    const queuedSnapshot = queuedSaveRef.current;
    if (!queuedSnapshot || !token) return;

    setIsSavingUserSettings(true);
    setUserSettingsError(null);

    try {
      const saved = await upsertUserSettings(token, queuedSnapshot);
      if (!mountedRef.current) return;

      const hasNewerQueuedDraft = queuedSaveRef.current !== queuedSnapshot;
      if (!hasNewerQueuedDraft) {
        queuedSaveRef.current = saved;
        setUserSettingsState((prev) =>
          areSettingsEqual(prev, saved) ? prev : saved
        );
        await persistLocal(saved);
      } else if (queuedSaveRef.current) {
        await persistLocal(queuedSaveRef.current);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      if (isUnauthorizedError(error)) {
        setUserSettingsError(null);
        void setToken(null);
        return;
      }
      setUserSettingsError(toErrorMessage(error));
    } finally {
      if (mountedRef.current) setIsSavingUserSettings(false);
    }
  }, [persistLocal, setToken, token]);

  const setUserSettings = useCallback(
    (next: UserSettings) => {
      setUserSettingsState(next);
      queuedSaveRef.current = next;
      setUserSettingsError(null);

      persistLocal(next).catch(() => {});
      if (!token) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void flushQueuedSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushQueuedSave, persistLocal, token]
  );

  const saveUserSettingsNow = useCallback(
    async (
      next: UserSettings,
      options?: { requireRemoteSuccess?: boolean }
    ) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const requireRemoteSuccess = options?.requireRemoteSuccess === true;
      queuedSaveRef.current = next;
      setUserSettingsError(null);

      if (!token) {
        setUserSettingsState(next);
        await persistLocal(next);
        return;
      }

      if (!requireRemoteSuccess) {
        setUserSettingsState(next);
        await persistLocal(next);
      }

      setIsSavingUserSettings(true);

      try {
        const saved = await upsertUserSettings(token, next);
        if (!mountedRef.current) return;

        queuedSaveRef.current = saved;
        setUserSettingsState((prev) =>
          areSettingsEqual(prev, saved) ? prev : saved
        );
        await persistLocal(saved);
      } catch (error) {
        if (!mountedRef.current) return;
        if (isUnauthorizedError(error)) {
          setUserSettingsError(null);
          void setToken(null);
          if (requireRemoteSuccess) throw error;
          return;
        }
        setUserSettingsError(toErrorMessage(error));
        if (requireRemoteSuccess) throw error;
      } finally {
        if (mountedRef.current) setIsSavingUserSettings(false);
      }
    },
    [persistLocal, setToken, token]
  );

  useEffect(() => {
    if (token) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    queuedSaveRef.current = null;
    setIsSavingUserSettings(false);
    setIsLoadingUserSettings(false);
    setHasLoadedUserSettings(false);
    setUserSettingsError(null);
    setUserSettingsState(INITIAL_USER_SETTINGS);
  }, [token]);

  const value = useMemo(
    () => ({
      userSettings,
      setUserSettings,
      saveUserSettingsNow,
      refreshUserSettings,
      isLoadingUserSettings,
      isSavingUserSettings,
      hasLoadedUserSettings,
      userSettingsError,
    }),
    [
      isLoadingUserSettings,
      isSavingUserSettings,
      hasLoadedUserSettings,
      refreshUserSettings,
      saveUserSettingsNow,
      setUserSettings,
      userSettings,
      userSettingsError,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useUserSettings must be used inside <UserSettingsProvider>");
  }
  return ctx;
}
