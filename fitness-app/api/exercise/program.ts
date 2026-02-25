// api/exercise/program.ts
import { CreateProgramRequest, Program } from "@/types/exercise";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../baseUrl";

async function authedFetch(input: RequestInfo, init?: RequestInit) {
  const token = await SecureStore.getItemAsync("token");
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Request failed: ${res.status}`);
  }
  return res;
}

// FETCH PROGRAMS
export async function GetProgramsForUser() {
  const res = await authedFetch(`${API_BASE_URL}/workoutprogram`);
  const data: Program[] = await res.json();
  return data;
}

// POST PROGRAM
export async function PostProgramForUser(name: string) {
  const body: CreateProgramRequest = { name };
  const res = await authedFetch(`${API_BASE_URL}/workoutprogram`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data: Program = await res.json();
  return data;
}

// UPDATE PROGRAM (name + workoutIds)
export async function UpdateProgramForUser(
  id: string,
  data: { name: string; workoutIds: string[] }
) {
  const res = await authedFetch(`${API_BASE_URL}/workoutprogram/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: data.name,
      workoutIds: Array.isArray(data.workoutIds) ? data.workoutIds : [],
    }),
  });

  return await res.json();
}

// DELETE PROGRAM
export async function DeleteProgramForUser(id: string) {
  await authedFetch(`${API_BASE_URL}/workoutprogram/${id}`, { method: "DELETE" });
  return;
}
