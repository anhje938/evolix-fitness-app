import { Exercise } from "@/types/exercise";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../baseUrl";

export async function getExercisesForUser() {
  const token = await SecureStore.getItemAsync("token");

  const res = await fetch(`${API_BASE_URL}/exercise`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

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
  const token = await SecureStore.getItemAsync("token");

  const res = await fetch(`${API_BASE_URL}/exercise`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

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
  const token = await SecureStore.getItemAsync("token");

  const res = await fetch(`${API_BASE_URL}/exercise/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Kunne ikke oppdatere øvelse (status: ${res.status})`
    );
  }

  return res.json();
}

export async function DeleteExercise(id: string) {
  const token = await SecureStore.getItemAsync("token");

  const res = await fetch(`${API_BASE_URL}/exercise/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Kunne ikke slette øvelse (status: ${res.status})`);
  }

  return true;
}
