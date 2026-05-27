import { getValidAccessToken, authFetch } from "@/api/authSession";
import {
  type CreateExercisePayload,
  type ExerciseMuscle,
  Exercise,
} from "@/types/exercise";
import { API_BASE_URL } from "../baseUrl";

async function readErrorMessage(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return "";

  try {
    const payload = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.message === "string") return payload.message;
  } catch {
    // Keep the raw response if it is not JSON.
  }

  return text;
}

export async function getExercisesForUser() {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/exercise`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
    { token }
  );

  if (!res.ok) {
    const errorText = await readErrorMessage(res);
    throw new Error(errorText || `Request failed: ${res.status}`);
  }

  const data: Exercise[] = await res.json();
  return data;
}

export async function CreateExercise(payload: CreateExercisePayload) {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/exercise`,
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
    const text = await readErrorMessage(res);
    throw new Error(text || `Kunne ikke opprette øvelse (status: ${res.status})`);
  }

  const data: Exercise = await res.json();
  return data;
}

export async function UpdateExercise(
  id: string,
  payload: {
    name: string;
    description?: string;
    muscle?: string;
    specificMuscleGroups?: string;
    equipment?: string;
    category?: string;
    equipmentType?: string;
    isBodyweight?: boolean;
    isIsolation?: boolean;
    isCompound?: boolean;
    defaultProgressionStepKg?: number | null;
    muscles?: ExerciseMuscle[];
  }
) {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/exercise/${id}`,
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
    const text = await readErrorMessage(res);
    throw new Error(text || `Kunne ikke oppdatere øvelse (status: ${res.status})`);
  }

  return res.json();
}

export async function DeleteExercise(id: string) {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/exercise/${id}`,
    {
      method: "DELETE",
    },
    { token }
  );

  if (!res.ok) {
    const text = await readErrorMessage(res);
    throw new Error(text || `Kunne ikke slette øvelse (status: ${res.status})`);
  }

  return true;
}
