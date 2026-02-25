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
const SAVE_DEBOUNCE_MS = 450;
const INITIAL_USER_SETTINGS: UserSettings = {
  calorieGoal: 2500,
  proteinGoal: 180,
  fatGoal: 70,
  carbGoal: 220,
  muscleFilter: "advanced",
  homeGoalTiles: ["calories", "protein", "carbs", "fat"],
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
  };
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
        setUserSettingsState(mergeWithDefaults(parsed));
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

      setUserSettingsState(remote);
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
    const queued = queuedSaveRef.current;
    if (!queued || !token) return;

    setIsSavingUserSettings(true);
    setUserSettingsError(null);

    try {
      const saved = await upsertUserSettings(token, queued);
      if (!mountedRef.current) return;

      setUserSettingsState(saved);
      queuedSaveRef.current = saved;
      await persistLocal(saved);
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
