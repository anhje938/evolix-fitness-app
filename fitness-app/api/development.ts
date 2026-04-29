import { authFetch } from "./authSession";
import { API_BASE_URL } from "./baseUrl";

export type DevelopmentSeedResult = {
  foodLogs: number;
  weightLogs: number;
  workoutSessions: number;
  exercises: number;
  foodAndWeightFromUtc: string;
  foodAndWeightToUtc: string;
  trainingFromUtc: string;
  trainingToUtc: string;
};

export async function SeedDevelopmentMockData(
  token: string
): Promise<DevelopmentSeedResult> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/development/seed-mock-data`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
    { token }
  );

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (!text) {
    throw new Error("Server returned empty response body");
  }

  return JSON.parse(text) as DevelopmentSeedResult;
}
