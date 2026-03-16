import { authFetch, getValidAccessToken } from "@/api/authSession";
import { CreateProgramRequest, Program } from "@/types/exercise";
import { API_BASE_URL } from "../baseUrl";

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
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Request failed: ${res.status}`);
  }
  return res;
}

export async function GetProgramsForUser() {
  const res = await authedFetch(`${API_BASE_URL}/workoutprogram`);
  const data: Program[] = await res.json();
  return data;
}

export async function PostProgramForUser(name: string) {
  const body: CreateProgramRequest = { name };
  const res = await authedFetch(`${API_BASE_URL}/workoutprogram`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data: Program = await res.json();
  return data;
}

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

export async function DeleteProgramForUser(id: string) {
  await authedFetch(`${API_BASE_URL}/workoutprogram/${id}`, { method: "DELETE" });
}
