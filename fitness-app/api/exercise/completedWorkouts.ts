import { API_BASE_URL } from "@/api/baseUrl";
import { authFetch, getValidAccessToken } from "@/api/authSession";

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
  muscleGroups?: string[];
  MuscleGroups?: string[];
};

async function authedFetch(input: RequestInfo, init?: RequestInit) {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    input,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res;
}

function mapToCompletedSummary(
  s: WorkoutSessionResponseDto
): CompletedWorkoutSummaryDto {
  const finishedAtUtc = s.finishedAtUtc ?? s.startedAtUtc;
  const setsCount = s.totalSets ?? 0;
  const exercisesCount = s.exercisesCount ?? 0;
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

export async function getCompletedWorkouts(): Promise<
  CompletedWorkoutSummaryDto[]
> {
  const res = await authedFetch(`${API_BASE_URL}/workoutsession/completed`);
  const raw = (await res.json()) as WorkoutSessionResponseDto[];

  const finishedOnly = raw.filter((x) => !!x.finishedAtUtc);
  return finishedOnly.map(mapToCompletedSummary);
}
