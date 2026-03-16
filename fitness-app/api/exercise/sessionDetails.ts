import { authFetch, getValidAccessToken } from "@/api/authSession";
import { API_BASE_URL } from "../baseUrl";

export type SessionDetailsDto = {
  id: string;
  title: string | null;
  workoutId: string | null;
  workoutProgramId: string | null;
  startedAtUtc: string;
  finishedAtUtc: string | null;
  exerciseLogs: Array<{
    id: string;
    exerciseId: string;
    name: string;
    muscle: string | null;
    order: number;
    sets: Array<{
      id: string;
      setNumber: number;
      weightKg: number | null;
      reps: number | null;
    }>;
  }>;
};

export async function getSessionDetails(
  sessionId: string
): Promise<SessionDetailsDto> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/workoutsession/${sessionId}/details`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}
