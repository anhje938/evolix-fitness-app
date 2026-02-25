import { API_BASE_URL } from "@/api/baseUrl";
import * as SecureStore from "expo-secure-store";

export type ExerciseHistoryPointDto = {
  exerciseId: string;
  performedAtUtc: string;
  topSetWeightKg: number | null;
  topSetReps: number | null;     // 👈 NY
  totalSets: number;
  totalVolumeKg: number | null;
};

//GETS EXERCISE HISTORY FOR BEST MEASUREMENT PR SESSION
export async function getExerciseHistory(
  exerciseId: string
): Promise<ExerciseHistoryPointDto[]> {
  const token = await SecureStore.getItemAsync("token");
  if (!token) throw new Error("Mangler auth-token");

  const res = await fetch(
    `${API_BASE_URL}/workoutsession/exercise/${exerciseId}/history`,
    
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
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

//GETS ALL EXERCISEHISTORY
export async function getExerciseSetsHistory(
  exerciseId: string
): Promise<ExerciseSessionSetsDto[]> {
  const token = await SecureStore.getItemAsync("token");
  if (!token) throw new Error("Mangler auth-token");

  const res = await fetch(
    `${API_BASE_URL}/workoutsession/exercise/${exerciseId}/sets-history`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

