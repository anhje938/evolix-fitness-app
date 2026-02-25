// api/weight.ts
import { Weight } from "@/types/weight";
import { API_BASE_URL } from "./baseUrl";

export async function PostWeight(
  token: string,
  weightKg: number,
  timestampUtc: string
) {
  const res = await fetch(`${API_BASE_URL}/weight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ weightKg, timestampUtc }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Request failed with status ${res.status}`);
  }

  return await res.json();
}

export async function getUserWeights(token: string): Promise<Weight[]> {
  const res = await fetch(`${API_BASE_URL}/weight`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Request failed: ${res.status}`);
  }

  return (await res.json()) as Weight[];
}
