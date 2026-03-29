import type {
  SessionExercise,
  SessionMode,
  SessionSet,
  WorkoutSession,
} from "@/types/exercise";
import React, {
  createContext,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";

import {
  getAccessTokenUserId,
  getValidAccessToken,
} from "@/api/authSession";
import type { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";
import type {
  ExerciseHistoryPointDto,
  ExerciseSessionSetItemDto,
  ExerciseSessionSetsDto,
} from "@/api/exercise/exerchiseHistory";
import { getSessionDetails } from "@/api/exercise/sessionDetails";
import {
  deleteWorkoutSession,
  postWorkoutSession,
  putWorkoutSession,
} from "@/api/exercise/workoutSession";
import { useAuth } from "@/context/AuthProvider";
import {
  clearStoredActiveWorkoutSession,
  loadStoredActiveWorkoutSession,
  saveStoredActiveWorkoutSession,
} from "@/utils/activeWorkoutSessionStorage";
import { useQueryClient } from "@tanstack/react-query";

const AUTOSAVE_DELAY_MS = 350;

type OpenProgramSessionArgs = {
  workoutProgramId?: string | null;
  workoutId?: string | null;
  name: string;
  exercises: {
    exerciseId: string;
    name: string;
    muscle?: string | null;
  }[];
};

type WorkoutSessionContextValue = {
  isOpen: boolean;
  isMinimized: boolean;
  isSaving: boolean;
  session: WorkoutSession | null;

  openQuickSession: (name?: string) => void;
  openProgramSession: (args: OpenProgramSessionArgs) => void;
  openCompletedSession: (sessionId: string) => Promise<void>;

  closeSession: () => void;
  toggleMinimized: () => void;
  renameSession: (name: string) => void;
  deleteSession: () => Promise<void>;

  addExercise: (payload: {
    exerciseId: string;
    name: string;
    muscle?: string | null;
  }) => void;

  addSet: (sessionExerciseId: string) => void;
  applySetTemplate: (
    sessionExerciseId: string,
    template: Array<{ reps: number | null; weight: number | null }>
  ) => void;
  updateSet: (
    sessionExerciseId: string,
    setId: string,
    partial: Partial<SessionSet>
  ) => void;
  removeSet: (sessionExerciseId: string, setId: string) => void;

  finishAndSave: (options?: {
    nameOverride?: string;
    onSuccess?: () => void | Promise<void>;
  }) => Promise<void>;
};

const WorkoutSessionContext = createContext<
  WorkoutSessionContextValue | undefined
>(undefined);

export const useWorkoutSession = () => {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) {
    throw new Error(
      "useWorkoutSession must be used within a WorkoutSessionProvider"
    );
  }
  return ctx;
};

type ProviderProps = {
  children: ReactNode;
};

const makeLocalId = () => Math.random().toString(36).slice(2, 10);

const makeClientRequestId = () =>
  `ws_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

function normalizeName(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function ensureActiveSessionClientRequestId(
  session: WorkoutSession
): WorkoutSession {
  if (session.finishedAtUtc) return session;

  const clientRequestId = session.clientRequestId?.trim() || makeClientRequestId();
  if (clientRequestId === session.clientRequestId) {
    return session;
  }

  return {
    ...session,
    clientRequestId,
  };
}

function resolveNextState<T>(prev: T, next: SetStateAction<T>): T {
  return typeof next === "function"
    ? (next as (current: T) => T)(prev)
    : next;
}

function toOptimisticCompletedWorkout(
  sessionId: string,
  session: WorkoutSession
): CompletedWorkoutSummaryDto {
  const finishedAtUtc = new Date().toISOString();

  let setsCount = 0;
  let totalVolumeKg = 0;
  const muscles = new Set<string>();

  for (const ex of session.exercises) {
    if (ex.muscle) muscles.add(ex.muscle);
    for (const set of ex.sets) {
      setsCount += 1;
      const weight = Number(set.weight ?? 0);
      const reps = Number(set.reps ?? 0);
      if (
        Number.isFinite(weight) &&
        Number.isFinite(reps) &&
        weight > 0 &&
        reps > 0
      ) {
        totalVolumeKg += weight * reps;
      }
    }
  }

  return {
    id: sessionId,
    name: session.name ?? "Økt",
    mode: session.workoutId ? "program" : "quick",
    startedAtUtc: session.startedAtUtc,
    finishedAtUtc,
    exercisesCount: session.exercises.length,
    setsCount,
    completedSetsCount: setsCount,
    totalVolumeKg: totalVolumeKg > 0 ? totalVolumeKg : null,
    muscleGroups: Array.from(muscles),
  };
}

function toOptimisticExerciseHistoryPoint(
  exercise: SessionExercise,
  performedAtUtc: string
): ExerciseHistoryPointDto | null {
  const sets = exercise.sets.filter((set) => (set.reps ?? 0) > 0);
  if (sets.length === 0) return null;

  const weightedSets = sets.filter((set) => set.weight != null);
  const topSet =
    weightedSets.length > 0
      ? [...weightedSets].sort((a, b) => {
          const weightDiff = (b.weight ?? 0) - (a.weight ?? 0);
          if (weightDiff !== 0) return weightDiff;
          return (b.reps ?? 0) - (a.reps ?? 0);
        })[0]
      : null;

  const totalVolumeKg = sets
    .filter(
      (set) =>
        Number.isFinite(set.weight) &&
        Number.isFinite(set.reps) &&
        (set.weight ?? 0) > 0 &&
        (set.reps ?? 0) > 0
    )
    .reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0);

  return {
    exerciseId: exercise.exerciseId,
    performedAtUtc,
    topSetWeightKg:
      topSet && (topSet.weight ?? 0) > 0 ? (topSet.weight ?? null) : null,
    topSetReps: topSet?.reps ?? null,
    totalSets: sets.length,
    totalVolumeKg: totalVolumeKg > 0 ? totalVolumeKg : null,
  };
}

function toOptimisticExerciseSetItems(
  sessionId: string,
  exercise: SessionExercise
): ExerciseSessionSetItemDto[] {
  return exercise.sets
    .filter((set) => (set.reps ?? 0) > 0)
    .map((set, index) => ({
      setId: `optimistic:${sessionId}:${exercise.exerciseId}:${index + 1}`,
      workoutExerciseLogId: `optimistic:${sessionId}:${exercise.exerciseId}`,
      setNumber: index + 1,
      weightKg: set.weight ?? null,
      reps: set.reps ?? null,
      rir: null,
      setType: null,
      notes: null,
    }));
}

function toOptimisticExerciseSetsHistoryEntry(
  sessionId: string,
  exercise: SessionExercise,
  performedAtUtc: string
): ExerciseSessionSetsDto | null {
  const sets = toOptimisticExerciseSetItems(sessionId, exercise);
  if (sets.length === 0) return null;

  const totalReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
  const totalVolumeKg = sets.reduce((sum, set) => {
    if ((set.weightKg ?? 0) <= 0 || (set.reps ?? 0) <= 0) return sum;
    return sum + (set.weightKg ?? 0) * (set.reps ?? 0);
  }, 0);

  return {
    sessionId,
    exerciseId: exercise.exerciseId,
    performedAtUtc,
    sets,
    totalSets: sets.length,
    totalReps,
    totalVolumeKg: totalVolumeKg > 0 ? totalVolumeKg : null,
  };
}

function mergeExerciseHistoryPoint(
  previous: ExerciseHistoryPointDto[] | undefined,
  nextPoint: ExerciseHistoryPointDto
): ExerciseHistoryPointDto[] {
  const list = Array.isArray(previous) ? previous : [];
  const filtered = list.filter(
    (item) =>
      !(
        item.exerciseId === nextPoint.exerciseId &&
        item.performedAtUtc === nextPoint.performedAtUtc
      )
  );

  return [...filtered, nextPoint].sort(
    (a, b) =>
      new Date(a.performedAtUtc).getTime() -
      new Date(b.performedAtUtc).getTime()
  );
}

function mergeExerciseSetsHistoryEntry(
  previous: ExerciseSessionSetsDto[] | undefined,
  nextEntry: ExerciseSessionSetsDto
): ExerciseSessionSetsDto[] {
  const list = Array.isArray(previous) ? previous : [];
  const filtered = list.filter((item) => item.sessionId !== nextEntry.sessionId);

  return [nextEntry, ...filtered].sort(
    (a, b) =>
      new Date(b.performedAtUtc).getTime() -
      new Date(a.performedAtUtc).getTime()
  );
}

export function WorkoutSessionProvider({ children }: ProviderProps) {
  const queryClient = useQueryClient();
  const { authReady, token } = useAuth();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hydratedScopeKey, setHydratedScopeKey] = useState<string | null>(null);

  const authUserId = useMemo(() => getAccessTokenUserId(token), [token]);
  const storageScopeKey = authUserId ? `user:${authUserId}` : null;
  const hasHydratedStoredSession =
    authReady && (!storageScopeKey || hydratedScopeKey === storageScopeKey);

  const previousStorageScopeKeyRef = useRef<string | null>(null);
  const draftScopeKeyRef = useRef<string | null>(null);
  const sessionRef = useRef<WorkoutSession | null>(null);
  const isOpenRef = useRef(false);
  const isMinimizedRef = useRef(false);
  const hasHydratedStoredSessionRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const finishAndSavePromiseRef = useRef<Promise<void> | null>(null);
  const activeClientRequestIdRef = useRef<string | null>(null);

  const setSessionState = useCallback(
    (next: SetStateAction<WorkoutSession | null>) => {
      setSession((prev) => {
        const resolved = resolveNextState(prev, next);
        sessionRef.current = resolved;
        return resolved;
      });
    },
    []
  );

  const setIsOpenState = useCallback((next: SetStateAction<boolean>) => {
    setIsOpen((prev) => {
      const resolved = resolveNextState(prev, next);
      isOpenRef.current = resolved;
      return resolved;
    });
  }, []);

  const setIsMinimizedState = useCallback((next: SetStateAction<boolean>) => {
    setIsMinimized((prev) => {
      const resolved = resolveNextState(prev, next);
      isMinimizedRef.current = resolved;
      return resolved;
    });
  }, []);

  useLayoutEffect(() => {
    sessionRef.current = session;
    isOpenRef.current = isOpen;
    isMinimizedRef.current = isMinimized;
    hasHydratedStoredSessionRef.current = hasHydratedStoredSession;
  }, [hasHydratedStoredSession, isMinimized, isOpen, session]);

  useEffect(() => {
    if (!session || session.finishedAtUtc) {
      activeClientRequestIdRef.current = null;
      return;
    }

    if (!session.clientRequestId?.trim()) {
      const normalized = ensureActiveSessionClientRequestId(session);
      activeClientRequestIdRef.current = normalized.clientRequestId ?? null;

      if (normalized !== session) {
        setSessionState(normalized);
      }
      return;
    }

    activeClientRequestIdRef.current = session.clientRequestId.trim();
  }, [session, setSessionState]);

  const persistActiveSessionNow = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!hasHydratedStoredSessionRef.current) return;

    const draftScopeKey = draftScopeKeyRef.current;
    const currentSession = sessionRef.current;

    if (
      !draftScopeKey ||
      !currentSession ||
      currentSession.finishedAtUtc ||
      !isOpenRef.current
    ) {
      return;
    }

    await saveStoredActiveWorkoutSession({
      scopeKey: draftScopeKey,
      session: currentSession,
      isMinimized: isMinimizedRef.current,
    });
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const previousStorageScopeKey = previousStorageScopeKeyRef.current;
    previousStorageScopeKeyRef.current = storageScopeKey;

    if (previousStorageScopeKey !== storageScopeKey) {
      draftScopeKeyRef.current = null;
      setSessionState(null);
      setIsOpenState(false);
      setIsMinimizedState(false);
    }

    if (!storageScopeKey) {
      setHydratedScopeKey(null);
      return;
    }

    if (hydratedScopeKey === storageScopeKey) return;

    let cancelled = false;

    void (async () => {
      let restored: Awaited<
        ReturnType<typeof loadStoredActiveWorkoutSession>
      > | null = null;

      try {
        restored = await loadStoredActiveWorkoutSession(storageScopeKey);
      } finally {
        if (cancelled) return;

        if (restored) {
          const restoredSession = ensureActiveSessionClientRequestId(
            restored.session
          );
          draftScopeKeyRef.current = storageScopeKey;
          activeClientRequestIdRef.current =
            restoredSession.clientRequestId ?? null;
          setSessionState(restoredSession);
          setIsOpenState(true);
          setIsMinimizedState(restored.isMinimized);
        } else if (
          !sessionRef.current ||
          draftScopeKeyRef.current === storageScopeKey
        ) {
          draftScopeKeyRef.current = null;
          setSessionState(null);
          setIsOpenState(false);
          setIsMinimizedState(false);
        }

        setHydratedScopeKey(storageScopeKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authReady,
    hydratedScopeKey,
    setIsMinimizedState,
    setIsOpenState,
    setSessionState,
    storageScopeKey,
  ]);

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!hasHydratedStoredSession) return;
    if (!session || session.finishedAtUtc || !isOpen || !draftScopeKeyRef.current) {
      return;
    }

    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void persistActiveSessionNow().catch((error) => {
        console.log("Failed to persist workout session", error);
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [hasHydratedStoredSession, isMinimized, isOpen, persistActiveSessionNow, session]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        previousState === "active" &&
        (nextState === "inactive" || nextState === "background")
      ) {
        void persistActiveSessionNow().catch((error) => {
          console.log("Failed to flush workout session", error);
        });
      }
    });

    return () => {
      subscription.remove();
      void persistActiveSessionNow().catch(() => {});
    };
  }, [persistActiveSessionNow]);

  const focusActiveSession = useCallback(
    (message: string) => {
      if (!authReady) {
        Alert.alert(
          "Laster bruker",
          "Vent et øyeblikk før du starter eller gjenopptar en økt."
        );
        return true;
      }

      if (!storageScopeKey) {
        Alert.alert(
          "Mangler bruker",
          "Kunne ikke knytte økten til en bruker. Logg inn på nytt."
        );
        return true;
      }

      if (!hasHydratedStoredSession) {
        Alert.alert(
          "Gjenoppretter økt",
          "Vent et øyeblikk mens vi henter en aktiv økt."
        );
        return true;
      }

      if (!session || session.finishedAtUtc) return false;

      setIsOpenState(true);
      setIsMinimizedState(false);
      Alert.alert("Økt allerede i gang", message);
      return true;
    },
    [
      authReady,
      hasHydratedStoredSession,
      session,
      setIsMinimizedState,
      setIsOpenState,
      storageScopeKey,
    ]
  );

  const openQuickSession = useCallback(
    (name?: string) => {
      if (
        focusActiveSession(
          "Du har allerede en aktiv økt. Fortsett den før du starter en ny hurtigøkt."
        )
      ) {
        return;
      }

      const now = new Date().toISOString();

      const newSession: WorkoutSession = {
        id: undefined,
        clientRequestId: makeClientRequestId(),
        mode: "quick" as SessionMode,
        name: name || "Fri økt",
        workoutProgramId: null,
        workoutId: null,
        startedAtUtc: now,
        finishedAtUtc: null,
        exercises: [],
      };

      draftScopeKeyRef.current = storageScopeKey;
      activeClientRequestIdRef.current = newSession.clientRequestId ?? null;
      setSessionState(newSession);
      setIsOpenState(true);
      setIsMinimizedState(false);
    },
    [focusActiveSession, setIsMinimizedState, setIsOpenState, setSessionState, storageScopeKey]
  );

  const openProgramSession = useCallback(
    (args: OpenProgramSessionArgs) => {
      if (
        focusActiveSession(
          "Du har allerede en aktiv økt. Fullfør eller avbryt den før du starter en ny planlagt økt."
        )
      ) {
        return;
      }

      const now = new Date().toISOString();

      const exercises: SessionExercise[] = args.exercises.map((ex, index) => ({
        id: makeLocalId(),
        exerciseId: ex.exerciseId,
        name: ex.name,
        muscle: ex.muscle ?? null,
        order: index + 1,
        sets: [],
      }));

      const newSession: WorkoutSession = {
        id: undefined,
        clientRequestId: makeClientRequestId(),
        mode: "program" as SessionMode,
        name: args.name,
        workoutProgramId: args.workoutProgramId ?? null,
        workoutId: args.workoutId ?? null,
        startedAtUtc: now,
        finishedAtUtc: null,
        exercises,
      };

      draftScopeKeyRef.current = storageScopeKey;
      activeClientRequestIdRef.current = newSession.clientRequestId ?? null;
      setSessionState(newSession);
      setIsOpenState(true);
      setIsMinimizedState(false);
    },
    [focusActiveSession, setIsMinimizedState, setIsOpenState, setSessionState, storageScopeKey]
  );

  const openCompletedSession = useCallback(
    async (sessionId: string) => {
      if (
        focusActiveSession(
          "Du har allerede en aktiv økt. Fullfør eller avbryt den før du åpner en tidligere økt."
        )
      ) {
        return;
      }

      try {
        const dto = await getSessionDetails(sessionId);

        const exercises: SessionExercise[] = dto.exerciseLogs
          .slice()
          .sort((a: any, b: any) => a.order - b.order)
          .map((log: any) => {
            const sets: SessionSet[] = (log.sets ?? [])
              .slice()
              .sort((a: any, b: any) => a.setNumber - b.setNumber)
              .map((s: any) => ({
                id: String(s.id),
                reps: s.reps ?? null,
                weight: s.weightKg ?? null,
                completed: true,
              }));

            return {
              id: String(log.id),
              exerciseId: String(log.exerciseId),
              name: log.name,
              muscle: log.muscle ?? null,
              order: log.order,
              sets,
            };
          });

        const mapped: WorkoutSession = {
          id: String(dto.id),
          clientRequestId: null,
          mode: dto.workoutId ? ("program" as SessionMode) : ("quick" as SessionMode),
          name: dto.title ?? "Økt",
          workoutProgramId: dto.workoutProgramId ?? null,
          workoutId: dto.workoutId ?? null,
          startedAtUtc: dto.startedAtUtc,
          finishedAtUtc: dto.finishedAtUtc ?? null,
          exercises,
        };

        draftScopeKeyRef.current = null;
        activeClientRequestIdRef.current = null;
        setSessionState(mapped);
        setIsOpenState(true);
        setIsMinimizedState(false);
      } catch (err) {
        console.log("openCompletedSession error", err);
        Alert.alert(
          "Kunne ikke åpne økten",
          "Prøv igjen. Hvis feilen fortsetter, åpne appen på nytt."
        );
      }
    },
    [focusActiveSession, setIsMinimizedState, setIsOpenState, setSessionState]
  );

  const closeSession = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const draftScopeKey = draftScopeKeyRef.current;
    draftScopeKeyRef.current = null;

    if (draftScopeKey) {
      void clearStoredActiveWorkoutSession(draftScopeKey).catch((error) => {
        console.log("Failed to clear stored workout session", error);
      });
    }

    setSessionState(null);
    setIsOpenState(false);
    setIsMinimizedState(false);
    setIsSaving(false);
    finishAndSavePromiseRef.current = null;
    activeClientRequestIdRef.current = null;
  }, [setIsMinimizedState, setIsOpenState, setSessionState]);

  const toggleMinimized = useCallback(() => {
    setIsMinimizedState((prev) => !prev);
  }, [setIsMinimizedState]);

  const renameSession = useCallback((name: string) => {
    const next = normalizeName(name);

    setSessionState((prev) => {
      if (!prev) return prev;
      return { ...prev, name: next.length > 0 ? next : prev.name };
    });
  }, [setSessionState]);

  const deleteSession = useCallback(async () => {
    if (!session?.id) return;

    const sessionId = session.id;
    const previousCompleted =
      queryClient.getQueryData<CompletedWorkoutSummaryDto[]>([
        "completedWorkouts",
      ]) ?? [];

    try {
      queryClient.setQueryData<CompletedWorkoutSummaryDto[]>(
        ["completedWorkouts"],
        (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.filter((x) => x.id !== sessionId);
        }
      );

      closeSession();

      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error("Mangler auth-token for å slette økt");

      await deleteWorkoutSession(sessionId, accessToken);
      await queryClient.invalidateQueries({ queryKey: ["completedWorkouts"] });
    } catch (err) {
      console.log("deleteSession error", err);
      queryClient.setQueryData<CompletedWorkoutSummaryDto[]>(
        ["completedWorkouts"],
        previousCompleted
      );
      Alert.alert("Kunne ikke slette økten", "Prøv igjen om et øyeblikk.");
    }
  }, [closeSession, queryClient, session?.id]);

  const addExercise = useCallback(
    (payload: { exerciseId: string; name: string; muscle?: string | null }) => {
      setSessionState((prev) => {
        if (!prev) return prev;

        const maxOrder =
          prev.exercises.length > 0
            ? Math.max(...prev.exercises.map((exercise) => exercise.order))
            : 0;

        const newExercise: SessionExercise = {
          id: `local_${makeLocalId()}`,
          exerciseId: payload.exerciseId,
          name: payload.name,
          muscle: payload.muscle ?? null,
          order: maxOrder + 1,
          sets: [],
        };

        return { ...prev, exercises: [...prev.exercises, newExercise] };
      });
    },
    [setSessionState]
  );

  const addSet = useCallback((sessionExerciseId: string) => {
    setSessionState((prev) => {
      if (!prev) return prev;

      const updatedExercises = prev.exercises.map((exercise) => {
        if (exercise.id !== sessionExerciseId) return exercise;

        const newSet: SessionSet = {
          id: `local_${makeLocalId()}`,
          reps: null,
          weight: null,
          completed: false,
        };

        return { ...exercise, sets: [...exercise.sets, newSet] };
      });

      return { ...prev, exercises: updatedExercises };
    });
  }, [setSessionState]);

  const applySetTemplate = useCallback(
    (
      sessionExerciseId: string,
      template: Array<{ reps: number | null; weight: number | null }>
    ) => {
      setSessionState((prev) => {
        if (!prev) return prev;

        const sanitizedTemplate = template.filter(
          (set) => set.reps != null || set.weight != null
        );

        if (sanitizedTemplate.length === 0) {
          return prev;
        }

        const updatedExercises = prev.exercises.map((exercise) => {
          if (exercise.id !== sessionExerciseId) return exercise;

          const sets: SessionSet[] = sanitizedTemplate.map((set) => ({
            id: `local_${makeLocalId()}`,
            reps: set.reps,
            weight: set.weight,
            completed: false,
          }));

          return { ...exercise, sets };
        });

        return { ...prev, exercises: updatedExercises };
      });
    },
    [setSessionState]
  );

  const updateSet = useCallback(
    (
      sessionExerciseId: string,
      setId: string,
      partial: Partial<SessionSet>
    ) => {
      setSessionState((prev) => {
        if (!prev) return prev;

        const updatedExercises = prev.exercises.map((exercise) => {
          if (exercise.id !== sessionExerciseId) return exercise;

          const updatedSets = exercise.sets.map((set) =>
            set.id === setId ? { ...set, ...partial } : set
          );

          return { ...exercise, sets: updatedSets };
        });

        return { ...prev, exercises: updatedExercises };
      });
    },
    [setSessionState]
  );

  const removeSet = useCallback((sessionExerciseId: string, setId: string) => {
    setSessionState((prev) => {
      if (!prev) return prev;

      const updatedExercises = prev.exercises
        .map((exercise) => {
          if (exercise.id !== sessionExerciseId) return exercise;

          const remainingSets = exercise.sets.filter((set) => set.id !== setId);
          if (remainingSets.length === 0) return null;

          return { ...exercise, sets: remainingSets };
        })
        .filter((exercise): exercise is SessionExercise => exercise !== null);

      return { ...prev, exercises: updatedExercises };
    });
  }, [setSessionState]);

  const finishAndSave = useCallback(
    async (options?: {
      nameOverride?: string;
      onSuccess?: () => void | Promise<void>;
    }) => {
      if (!sessionRef.current) return;
      if (finishAndSavePromiseRef.current) {
        return finishAndSavePromiseRef.current;
      }

      const run = (async () => {
        setIsSaving(true);

        try {
        const currentSession = sessionRef.current;
        if (!currentSession) return;

        const editingCompletedSessionId =
          currentSession.id && currentSession.finishedAtUtc
            ? currentSession.id
            : null;

        const filteredExercises: SessionExercise[] = currentSession.exercises
          .map((exercise) => ({
            ...exercise,
            sets: exercise.sets.filter((set) => set.completed),
          }))
          .filter((exercise) => exercise.sets.length > 0);

        if (filteredExercises.length === 0) {
          closeSession();
          return;
        }

        const sanitizedExercises: SessionExercise[] = filteredExercises
          .map((exercise) => ({
            ...exercise,
            sets: exercise.sets.filter((set) => (set.reps ?? 0) > 0),
          }))
          .filter((exercise) => exercise.sets.length > 0);

        if (sanitizedExercises.length === 0) {
          closeSession();
          return;
        }

        const accessToken = await getValidAccessToken();
        if (!accessToken) throw new Error("Mangler auth-token for å lagre økt");

        const nextName =
          normalizeName(options?.nameOverride ?? currentSession.name) ||
          currentSession.name;

        const clientRequestId =
          currentSession.clientRequestId?.trim() ||
          activeClientRequestIdRef.current ||
          makeClientRequestId();

        activeClientRequestIdRef.current = clientRequestId;

        if (clientRequestId !== currentSession.clientRequestId) {
          setSessionState((prev) =>
            prev ? { ...prev, clientRequestId } : prev
          );
        }

        const payload: WorkoutSession = {
          ...currentSession,
          clientRequestId,
          name: nextName,
          exercises: sanitizedExercises,
        };
        const performedAtUtc = payload.startedAtUtc;
        const affectedExerciseIds = Array.from(
          new Set(
            [...currentSession.exercises, ...payload.exercises]
              .map((exercise) => exercise.exerciseId)
              .filter((exerciseId) => exerciseId.trim().length > 0)
          )
        );

        let savedSessionId = "";

        if (editingCompletedSessionId) {
          await putWorkoutSession(editingCompletedSessionId, payload, accessToken);
          savedSessionId = editingCompletedSessionId;
        } else {
          savedSessionId = await postWorkoutSession(payload, accessToken);
        }

        const optimistic = toOptimisticCompletedWorkout(savedSessionId, payload);
        queryClient.setQueryData<CompletedWorkoutSummaryDto[]>(
          ["completedWorkouts"],
          (prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const withoutSaved = list.filter((item) => item.id !== savedSessionId);
            return [optimistic, ...withoutSaved];
          }
        );

        if (!editingCompletedSessionId) {
          for (const exercise of payload.exercises) {
            const nextHistoryPoint = toOptimisticExerciseHistoryPoint(
              exercise,
              performedAtUtc
            );
            if (nextHistoryPoint) {
              queryClient.setQueryData<ExerciseHistoryPointDto[]>(
                ["exerciseHistory", exercise.exerciseId],
                (prev) => mergeExerciseHistoryPoint(prev, nextHistoryPoint)
              );

              queryClient.setQueriesData<Record<string, ExerciseHistoryPointDto[]>>(
                { queryKey: ["exerciseHistoryBulk"] },
                (prev) => {
                  if (!prev || typeof prev !== "object") return prev;
                  return {
                    ...prev,
                    [exercise.exerciseId]: mergeExerciseHistoryPoint(
                      prev[exercise.exerciseId],
                      nextHistoryPoint
                    ),
                  };
                }
              );
            }

            const nextSetsEntry = toOptimisticExerciseSetsHistoryEntry(
              savedSessionId,
              exercise,
              performedAtUtc
            );
            if (nextSetsEntry) {
              queryClient.setQueryData<ExerciseSessionSetsDto[]>(
                ["exerciseSetsHistory", exercise.exerciseId],
                (prev) => mergeExerciseSetsHistoryEntry(prev, nextSetsEntry)
              );
            }
          }
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["completedWorkouts"],
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: ["exerciseHistoryBulk"],
            refetchType: "all",
          }),
          ...affectedExerciseIds.flatMap((exerciseId) => [
            queryClient.invalidateQueries({
              queryKey: ["exerciseHistory", exerciseId],
              refetchType: "all",
            }),
            queryClient.invalidateQueries({
              queryKey: ["exerciseSetsHistory", exerciseId],
              refetchType: "all",
            }),
          ]),
          ...(editingCompletedSessionId
            ? [
                queryClient.invalidateQueries({
                  queryKey: ["sessionDetails", editingCompletedSessionId],
                  refetchType: "all",
                }),
              ]
            : []),
        ]);

        await options?.onSuccess?.();

        closeSession();
      } catch (err) {
        console.log("finishAndSave error", err);
        Alert.alert(
          "Kunne ikke lagre",
          "Sjekk nettverk og prøv igjen. Økten er fortsatt åpen slik at du ikke mister data."
        );
      } finally {
        setIsSaving(false);
        finishAndSavePromiseRef.current = null;
      }
      })();

      finishAndSavePromiseRef.current = run;
      return run;
    },
    [closeSession, queryClient, setSessionState]
  );

  const value = useMemo<WorkoutSessionContextValue>(
    () => ({
      isOpen,
      isMinimized,
      isSaving,
      session,
      openQuickSession,
      openProgramSession,
      openCompletedSession,
      closeSession,
      toggleMinimized,
      renameSession,
      deleteSession,
      addExercise,
      addSet,
      applySetTemplate,
      updateSet,
      removeSet,
      finishAndSave,
    }),
    [
      addExercise,
      addSet,
      applySetTemplate,
      closeSession,
      deleteSession,
      finishAndSave,
      isSaving,
      isMinimized,
      isOpen,
      openCompletedSession,
      openProgramSession,
      openQuickSession,
      removeSet,
      renameSession,
      session,
      toggleMinimized,
      updateSet,
    ]
  );

  return (
    <WorkoutSessionContext.Provider value={value}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}
