// api/training/workoutSession.ts (oppdatert)
import { WorkoutSession } from "@/types/exercise";
import { API_BASE_URL } from "../baseUrl";

// Backend DTO-er (1:1 med WorkoutSessionController/Requests)
type StartWorkoutSessionRequest = {
  workoutId?: string | null;
  startedAtUtc?: string | null;
  title?: string | null;
};

type WorkoutSessionResponse = {
  id: string;
  userId: string;
  workoutId?: string | null;
  workoutProgramId?: string | null;
  title?: string | null;
  notes?: string | null;
  startedAtUtc: string;
  finishedAtUtc?: string | null;
  totalSets: number;
  totalReps: number;
  totalVolume?: number | null;
};

type AddSetRequest = {
  exerciseId: string;        // Guid
  setNumber?: number | null;
  weightKg?: number | null;
  reps?: number | null;
  rir?: number | null;
  distanceMeters?: number | null;
  duration?: string | null;
  setType?: string | null;
  notes?: string | null;
};

/**
 * Lagrer en komplett WorkoutSession til backend ved å:
 *  1) Starte en session (POST /api/workoutsession)
 *  2) Poste alle sett (POST /api/workoutsession/{id}/sets)
 *  3) Markere session som ferdig (POST /api/workoutsession/{id}/finish)
 */
export async function postWorkoutSession(
  session: WorkoutSession,
  token: string
): Promise<string> {
  // ---------- 1) Start session ----------
  const startBody: StartWorkoutSessionRequest = {
    workoutId: session.workoutId ?? null,
    startedAtUtc: session.startedAtUtc,
    title: session.name,
  };

  const startRes = await fetch(`${API_BASE_URL}/workoutsession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(startBody),
  });

  if (!startRes.ok) {
    const text = await startRes.text().catch(() => "");
    throw new Error(text || "Kunne ikke starte treningsøkt");
  }

  const started: WorkoutSessionResponse = await startRes.json();
  const sessionId = started.id;

  // ---------- 2) Send alle sett ----------
  // Vi loop’er gjennom alle exercises + sett i den lokale sessionen
  for (const ex of session.exercises) {
    for (let idx = 0; idx < ex.sets.length; idx++) {
      const set = ex.sets[idx];

      const payload: AddSetRequest = {
        exerciseId: ex.exerciseId,
        setNumber: idx + 1,       // 1-basert settnummer
        weightKg: set.weight ?? null,
        reps: set.reps ?? null,
        rir: null,
        distanceMeters: null,
        duration: null,
        setType: null,
        notes: null,
      };

      const setRes = await fetch(
        `${API_BASE_URL}/workoutsession/${sessionId}/sets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!setRes.ok) {
        const text = await setRes.text().catch(() => "");
        throw new Error(text || "Kunne ikke lagre sett i økten");
      }
    }
  }

  

  // ---------- 3) Fullfør session ----------
  const finishRes = await fetch(
    `${API_BASE_URL}/workoutsession/${sessionId}/finish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!finishRes.ok) {
    const text = await finishRes.text().catch(() => "");
    throw new Error(text || "Kunne ikke fullføre økten");
  }

  // Backend setter FinishedAtUtc selv (DateTime.UtcNow) og
  // regner totals (TotalSets, TotalReps, TotalVolume)
  return sessionId;
}


export async function deleteWorkoutSession(sessionId: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/workoutsession/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to delete session");
  }
}
