import { Workout } from "@/types/exercise";
import { API_BASE_URL } from "../baseUrl";
import * as SecureStore from "expo-secure-store"

export type CreateWorkoutPayload = {
  name: string;
  description?: string;
  dayLabel?: string;
  workoutProgramId?: string | null;
  exerciseIds?: string[];
};

export async function PostWorkoutForUser(
  payload: CreateWorkoutPayload
): Promise<Workout> {
  const token = await SecureStore.getItemAsync("token")

  const res = await fetch(`${API_BASE_URL}/workout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Kunne ikke opprette økt");
  }

  return res.json();
}

export async function GetWorkouts(): Promise<Workout[]> {
    const token = await SecureStore.getItemAsync("token");
  
    const res = await fetch(`${API_BASE_URL}/workout`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Kunne ikke hente workouts");
    }

    return res.json();
  }

  
export type UpdateWorkoutPayload = {
  name: string;
  description?: string;
  dayLabel?: string;
  workoutProgramId?: string | null;
  exerciseIds: string[];
};

export async function UpdateWorkoutForUser(
  id: string,
  payload: UpdateWorkoutPayload
): Promise<void> {
  const token = await SecureStore.getItemAsync("token")

  const res = await fetch(`${API_BASE_URL}/workout/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Kunne ikke oppdatere økt");
  }
}

export async function DeleteWorkoutForUser(id: string): Promise<void> {
  
  const token = await SecureStore.getItemAsync("token");

  const res = await fetch(`${API_BASE_URL}/workout/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Kunne ikke slette økt");
  }
}
