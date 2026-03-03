// context/workoutSessionContext.tsx
import type {
  SessionExercise,
  SessionMode,
  SessionSet,
  WorkoutSession,
} from "@/types/exercise";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";

import { getSessionDetails } from "@/api/exercise/sessionDetails";
import {
  deleteWorkoutSession,
  postWorkoutSession,
  putWorkoutSession,
} from "@/api/exercise/workoutSession";
import type { CompletedWorkoutSummaryDto } from "@/api/exercise/completedWorkouts";

import * as SecureStore from "expo-secure-store";
import { useQueryClient } from "@tanstack/react-query";

// ---- TYPES ----

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
  session: WorkoutSession | null;

  openQuickSession: (name?: string) => void;
  openProgramSession: (args: OpenProgramSessionArgs) => void;

  openCompletedSession: (sessionId: string) => Promise<void>;

  closeSession: () => void;
  toggleMinimized: () => void;

  /** Endrer navn/tittel lokalt i overlay */
  renameSession: (name: string) => void;

  /** Sletter HEL utfÃ¸rt Ã¸kt (kun nÃ¥r session.id finnes) */
  deleteSession: () => Promise<void>;

  addExercise: (payload: {
    exerciseId: string;
    name: string;
    muscle?: string | null;
  }) => void;

  addSet: (sessionExerciseId: string) => void;

  updateSet: (
    sessionExerciseId: string,
    setId: string,
    partial: Partial<SessionSet>
  ) => void;

  removeSet: (sessionExerciseId: string, setId: string) => void;

  finishAndSave: () => Promise<void>;
};

// ---- CONTEXT SETUP ----

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

function normalizeName(input: string) {
  return input.replace(/\s+/g, " ").trim();
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
    name: session.name ?? "Ã˜kt",
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

// ---- PROVIDER ----

export function WorkoutSessionProvider({ children }: ProviderProps) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // --- OPEN / CLOSE ---

  const openQuickSession = useCallback((name?: string) => {
    const now = new Date().toISOString();

    const newSession: WorkoutSession = {
      id: undefined,
      mode: "quick" as SessionMode,
      name: name || "Fri Ã¸kt",
      workoutProgramId: null,
      workoutId: null,
      startedAtUtc: now,
      finishedAtUtc: null,
      exercises: [],
    };

    setSession(newSession);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const openProgramSession = useCallback((args: OpenProgramSessionArgs) => {
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
      mode: "program" as SessionMode,
      name: args.name,
      workoutProgramId: args.workoutProgramId ?? null,
      workoutId: args.workoutId ?? null,
      startedAtUtc: now,
      finishedAtUtc: null,
      exercises,
    };

    setSession(newSession);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  /**
   * Ã…pne en tidligere Ã¸kt i overlay (utfÃ¸rt Ã¸kt)
   * Viktig: behold backend-idâ€™er pÃ¥ logs/sets
   */
  const openCompletedSession = useCallback(async (sessionId: string) => {
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
              id: String(s.id), // backend setId
              reps: s.reps ?? null,
              weight: s.weightKg ?? null,
              completed: true,
            }));

          return {
            id: String(log.id), // backend logId
            exerciseId: String(log.exerciseId),
            name: log.name,
            muscle: log.muscle ?? null,
            order: log.order,
            sets,
          };
        });

      const mapped: WorkoutSession = {
        id: String(dto.id), // backend sessionId
        mode: dto.workoutId
          ? ("program" as SessionMode)
          : ("quick" as SessionMode),
        name: dto.title ?? "Ã˜kt",
        workoutProgramId: dto.workoutProgramId ?? null,
        workoutId: dto.workoutId ?? null,
        startedAtUtc: dto.startedAtUtc,
        finishedAtUtc: dto.finishedAtUtc ?? null,
        exercises,
      };

      setSession(mapped);
      setIsOpen(true);
      setIsMinimized(false);
    } catch (err) {
      console.log("âŒ openCompletedSession error", err);
      Alert.alert(
        "Kunne ikke Ã¥pne Ã¸kten",
        "PrÃ¸v igjen. Hvis feilen fortsetter, Ã¥pne appen pÃ¥ nytt."
      );
    }
  }, []);

  const closeSession = useCallback(() => {
    setSession(null);
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const toggleMinimized = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // --- TITLE / NAME ---

  const renameSession = useCallback((name: string) => {
    const next = normalizeName(name);

    setSession((prev) => {
      if (!prev) return prev;
      return { ...prev, name: next.length > 0 ? next : prev.name };
    });
  }, []);

  // --- DELETE WHOLE SESSION (BACKEND) ---

  const deleteSession = useCallback(async () => {
    if (!session?.id) return; // kan ikke slette noe som ikke finnes i backend

    const sessionId = session.id;
    const previousCompleted =
      queryClient.getQueryData<CompletedWorkoutSummaryDto[]>([
        "completedWorkouts",
      ]) ?? [];

    try {
      // Optimistic update: fjern økten fra historikk umiddelbart i UI.
      queryClient.setQueryData<CompletedWorkoutSummaryDto[]>(
        ["completedWorkouts"],
        (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.filter((x) => x.id !== sessionId);
        }
      );

      closeSession();

      const token = await SecureStore.getItemAsync("token");
      if (!token) throw new Error("Mangler auth-token for å slette økt");

      await deleteWorkoutSession(sessionId, token);
      await queryClient.invalidateQueries({ queryKey: ["completedWorkouts"] });
    } catch (err) {
      console.log("❌ deleteSession error", err);
      queryClient.setQueryData<CompletedWorkoutSummaryDto[]>(
        ["completedWorkouts"],
        previousCompleted
      );
      Alert.alert(
        "Kunne ikke slette økten",
        "Prøv igjen om et øyeblikk."
      );
    }
  }, [session?.id, closeSession, queryClient]);

  // --- EXERCISES / SETS (LOCAL STATE) ---

  const addExercise = useCallback(
    (payload: { exerciseId: string; name: string; muscle?: string | null }) => {
      setSession((prev) => {
        if (!prev) return prev;

        const maxOrder =
          prev.exercises.length > 0
            ? Math.max(...prev.exercises.map((e) => e.order))
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
    []
  );

  const addSet = useCallback((sessionExerciseId: string) => {
    setSession((prev) => {
      if (!prev) return prev;

      const updatedExercises = prev.exercises.map((ex) => {
        if (ex.id !== sessionExerciseId) return ex;

        const newSet: SessionSet = {
          id: `local_${makeLocalId()}`,
          reps: null,
          weight: null,
          completed: false,
        };

        return { ...ex, sets: [...ex.sets, newSet] };
      });

      return { ...prev, exercises: updatedExercises };
    });
  }, []);

  const updateSet = useCallback(
    (
      sessionExerciseId: string,
      setId: string,
      partial: Partial<SessionSet>
    ) => {
      setSession((prev) => {
        if (!prev) return prev;

        const updatedExercises = prev.exercises.map((ex) => {
          if (ex.id !== sessionExerciseId) return ex;

          const updatedSets = ex.sets.map((s) =>
            s.id === setId ? { ...s, ...partial } : s
          );

          return { ...ex, sets: updatedSets };
        });

        return { ...prev, exercises: updatedExercises };
      });
    },
    []
  );

  const removeSet = useCallback((sessionExerciseId: string, setId: string) => {
    setSession((prev) => {
      if (!prev) return prev;

      const updatedExercises = prev.exercises
        .map((ex) => {
          if (ex.id !== sessionExerciseId) return ex;

          const remainingSets = ex.sets.filter((s) => s.id !== setId);
          if (remainingSets.length === 0) return null;

          return { ...ex, sets: remainingSets };
        })
        .filter((ex): ex is SessionExercise => ex !== null);

      return { ...prev, exercises: updatedExercises };
    });
  }, []);

  // --- FINISH & SAVE TO BACKEND ---

  const finishAndSave = useCallback(async () => {
    if (!session) return;

    try {
      const editingCompletedSessionId =
        session.id && session.finishedAtUtc ? session.id : null;

      const filteredExercises: SessionExercise[] = session.exercises
        .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.completed) }))
        .filter((ex) => ex.sets.length > 0);

      if (filteredExercises.length === 0) {
        closeSession();
        return;
      }

      const sanitizedExercises: SessionExercise[] = filteredExercises
        .map((ex) => ({
          ...ex,
          sets: ex.sets.filter((s) => (s.reps ?? 0) > 0),
        }))
        .filter((ex) => ex.sets.length > 0);

      if (sanitizedExercises.length === 0) {
        closeSession();
        return;
      }

      const token = await SecureStore.getItemAsync("token");
      if (!token) throw new Error("Mangler auth-token for Ã¥ lagre Ã¸kt");

      const payload: WorkoutSession = {
        ...session,
        name: normalizeName(session.name) || session.name,
        exercises: sanitizedExercises,
      };

      let savedSessionId = "";

      if (editingCompletedSessionId) {
        await putWorkoutSession(editingCompletedSessionId, payload, token);
        savedSessionId = editingCompletedSessionId;
      } else {
        savedSessionId = await postWorkoutSession(payload, token);
      }

      const optimistic = toOptimisticCompletedWorkout(savedSessionId, payload);
      queryClient.setQueryData<CompletedWorkoutSummaryDto[]>(
        ["completedWorkouts"],
        (prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const withoutSaved = list.filter((x) => x.id !== savedSessionId);
          return [optimistic, ...withoutSaved];
        }
      );

      await queryClient.invalidateQueries({ queryKey: ["completedWorkouts"] });

      closeSession();
    } catch (err) {
      console.log("âŒ finishAndSave error", err);
      Alert.alert(
        "Kunne ikke lagre",
        "Sjekk nettverk og prÃ¸v igjen. Ã˜kten er fortsatt Ã¥pen slik at du ikke mister data."
      );
    }
  }, [session, closeSession, queryClient]);

  const value = useMemo<WorkoutSessionContextValue>(
    () => ({
      isOpen,
      isMinimized,
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
      updateSet,
      removeSet,
      finishAndSave,
    }),
    [
      isOpen,
      isMinimized,
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
      updateSet,
      removeSet,
      finishAndSave,
    ]
  );

  return (
    <WorkoutSessionContext.Provider value={value}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}
