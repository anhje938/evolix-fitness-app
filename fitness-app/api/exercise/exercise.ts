import { getValidAccessToken, authFetch } from "@/api/authSession";
import { Exercise } from "@/types/exercise";
import { API_BASE_URL } from "../baseUrl";

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
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Request failed: ${res.status}`);
  }

  const data: Exercise[] = await res.json();
  return data;
}

export async function CreateExercise(payload: {
  name: string;
  description?: string;
  muscle?: string;
  equipment?: string;
  specificMuscleGroups?: string;
}) {
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
    const text = await res.text().catch(() => "");
    throw new Error(text || `Kunne ikke opprette øvelse (status: ${res.status})`);
  }

  return res.json();
}

export async function UpdateExercise(
  id: string,
  payload: {
    name: string;
    description?: string;
    muscle?: string;
    specificMuscleGroups?: string;
    equipment?: string;
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
    const text = await res.text().catch(() => "");
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
    const text = await res.text().catch(() => "");
    throw new Error(text || `Kunne ikke slette øvelse (status: ${res.status})`);
  }

  return true;
}
