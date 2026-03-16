import { API_BASE_URL } from "@/api/baseUrl";
import { authFetch, getValidAccessToken } from "@/api/authSession";

export type ExerciseHistoryPointDto = {
  exerciseId: string;
  performedAtUtc: string;
  topSetWeightKg: number | null;
  topSetReps: number | null;
  totalSets: number;
  totalVolumeKg: number | null;
};

export async function getExerciseHistory(
  exerciseId: string
): Promise<ExerciseHistoryPointDto[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/workoutsession/exercise/${exerciseId}/history`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

export type ExerciseSessionSetItemDto = {
  setId: string;
  workoutExerciseLogId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  setType: string | null;
  notes: string | null;
};

export type ExerciseSessionSetsDto = {
  sessionId: string;
  exerciseId: string;
  performedAtUtc: string;
  sets: ExerciseSessionSetItemDto[];
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number | null;
};

export async function getExerciseSetsHistory(
  exerciseId: string
): Promise<ExerciseSessionSetsDto[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/workoutsession/exercise/${exerciseId}/sets-history`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}
