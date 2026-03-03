import { fetchUserSettings, upsertUserSettings } from "@/api/userSettings";
import { useAuth } from "@/context/AuthProvider";
import type { UserSettings } from "@/types/userSettings";
import { isUnauthorizedError } from "@/utils/isUnauthorizedError";
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
  refreshUserSettings: () => Promise<void>;
  isLoadingUserSettings: boolean;
  isSavingUserSettings: boolean;
  userSettingsError: string | null;
};

const KEY = "user_settings";
const SAVE_DEBOUNCE_MS = 700;
const INITIAL_USER_SETTINGS: UserSettings = {
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
    a.proteinGoal === b.proteinGoal &&
    a.fatGoal === b.fatGoal &&
    a.carbGoal === b.carbGoal &&
    a.showOnlyCustomTrainingContent === b.showOnlyCustomTrainingContent &&
    a.weightGoalKg === b.weightGoalKg &&
    a.weightDirection === b.weightDirection &&
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
  const [userSettingsError, setUserSettingsError] = useState<string | null>(
    null
  );

  const mountedRef = useRef(true);
  const queuedSaveRef = useRef<UserSettings | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!authReady || !token) return;

    setIsLoadingUserSettings(true);
    setUserSettingsError(null);

    try {
      const remote = await fetchUserSettings(token);
      if (!mountedRef.current || !remote) return;

      setUserSettingsState((prev) =>
        areSettingsEqual(prev, remote) ? prev : remote
      );
      await persistLocal(remote);
    } catch (error) {
      if (!mountedRef.current) return;
      if (isUnauthorizedError(error)) {
        setUserSettingsError(null);
        void setToken(null);
        return;
      }
      setUserSettingsError(toErrorMessage(error));
    } finally {
      if (mountedRef.current) setIsLoadingUserSettings(false);
    }
  }, [authReady, persistLocal, setToken, token]);

  useEffect(() => {
    void refreshUserSettings();
  }, [refreshUserSettings]);

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

  useEffect(() => {
    if (token) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    queuedSaveRef.current = null;
    setIsSavingUserSettings(false);
  }, [token]);

  const value = useMemo(
    () => ({
      userSettings,
      setUserSettings,
      refreshUserSettings,
      isLoadingUserSettings,
      isSavingUserSettings,
      userSettingsError,
    }),
    [
      isLoadingUserSettings,
      isSavingUserSettings,
      refreshUserSettings,
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
