import { authFetch, getValidAccessToken } from "@/api/authSession";
import { Workout } from "@/types/exercise";
import { API_BASE_URL } from "../baseUrl";

export type CreateWorkoutPayload = {
  name: string;
  description?: string;
  dayLabel?: string;
  workoutProgramId?: string | null;
  isPremium?: boolean;
  exerciseIds?: string[];
};

export async function PostWorkoutForUser(
  payload: CreateWorkoutPayload
): Promise<Workout> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/workout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Kunne ikke opprette økt");
  }

  return res.json();
}

export async function GetWorkouts(): Promise<Workout[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(`${API_BASE_URL}/workout`, { method: "GET" }, { token });

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
  isPremium?: boolean;
  exerciseIds: string[];
};

export async function UpdateWorkoutForUser(
  id: string,
  payload: UpdateWorkoutPayload
): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/workout/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Kunne ikke oppdatere økt");
  }
}

export async function DeleteWorkoutForUser(id: string): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/workout/${id}`,
    {
      method: "DELETE",
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Kunne ikke slette økt");
  }
}
