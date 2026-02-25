import { API_BASE_URL } from "@/api/baseUrl";
import * as SecureStore from "expo-secure-store";

/**
 * Dette er UI-summaryen vi bruker i kalender + liste
 * (matcher det komponentene dine forventer).
 */
export type CompletedWorkoutSummaryDto = {
  id: string;
  name: string;
  mode: "quick" | "program";
  startedAtUtc: string;
  finishedAtUtc: string;
  exercisesCount: number;
  setsCount: number;
  completedSetsCount: number;
  totalVolumeKg: number | null;

  muscleGroups: string[];
};

/**
 * Dette er det backenden din returnerer.
 * Støtter både camelCase og PascalCase.
 */
type WorkoutSessionResponseDto = {
  id: string;
  userId: string;

  workoutId: string | null;
  workoutProgramId: string | null;

  title: string | null;
  notes: string | null;

  startedAtUtc: string;
  finishedAtUtc: string | null;

  totalSets: number;
  totalReps: number;
  totalVolume: number | null;

  exercisesCount?: number;

  // 🔥 Støtt begge casing-varianter
  muscleGroups?: string[];
  MuscleGroups?: string[];
};

async function authedFetch(input: RequestInfo, init?: RequestInit) {
  const token = await SecureStore.getItemAsync("token");
  if (!token) throw new Error("Mangler auth-token");

  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res;
}

function mapToCompletedSummary(s: WorkoutSessionResponseDto): CompletedWorkoutSummaryDto {
  const finishedAtUtc = s.finishedAtUtc ?? s.startedAtUtc;

  const setsCount = s.totalSets ?? 0;
  const exercisesCount = s.exercisesCount ?? 0;

  // 🔥 Hent muskelgrupper uansett casing
  const muscleGroups = s.muscleGroups ?? s.MuscleGroups ?? [];

  return {
    id: s.id,
    name: s.title ?? "Økt",
    mode: s.workoutId ? "program" : "quick",
    startedAtUtc: s.startedAtUtc,
    finishedAtUtc,

    exercisesCount,
    setsCount,
    completedSetsCount: setsCount,

    totalVolumeKg: s.totalVolume ?? null,

    muscleGroups,
  };
}

/**
 * ✅ Matcher backenden din nå:
 * GET /api/workoutsession/completed
 */
export async function getCompletedWorkouts(): Promise<CompletedWorkoutSummaryDto[]> {
  const res = await authedFetch(`${API_BASE_URL}/workoutsession/completed`);
  const raw = (await res.json()) as WorkoutSessionResponseDto[];

  const finishedOnly = raw.filter((x) => !!x.finishedAtUtc);
  return finishedOnly.map(mapToCompletedSummary);
}
