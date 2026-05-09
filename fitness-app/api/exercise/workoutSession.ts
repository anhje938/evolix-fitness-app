import { authFetch } from "@/api/authSession";
import { WorkoutSession } from "@/types/exercise";
import { API_BASE_URL } from "../baseUrl";

type CompleteWorkoutSessionRequest = {
  clientRequestId: string;
  workoutId?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  title?: string | null;
  notes?: string | null;
  exerciseLogs: UpdateWorkoutSessionExerciseLogRequest[];
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

type UpdateWorkoutSessionSetRequest = {
  setNumber?: number | null;
  weightKg?: number | null;
  reps?: number | null;
  rir?: number | null;
  distanceMeters?: number | null;
  duration?: string | null;
  setType?: string | null;
  notes?: string | null;
};

type UpdateWorkoutSessionExerciseLogRequest = {
  exerciseId: string;
  order?: number | null;
  notes?: string | null;
  sets: UpdateWorkoutSessionSetRequest[];
};

type UpdateWorkoutSessionRequest = {
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
  title?: string | null;
  notes?: string | null;
  exerciseLogs: UpdateWorkoutSessionExerciseLogRequest[];
};

export async function postWorkoutSession(
  session: WorkoutSession,
  token: string
): Promise<string> {
  if (!session.clientRequestId?.trim()) {
    throw new Error("Workout session mangler clientRequestId");
  }

  const payload: CompleteWorkoutSessionRequest = {
    clientRequestId: session.clientRequestId.trim(),
    workoutId: session.workoutId ?? null,
    startedAtUtc: session.startedAtUtc,
    finishedAtUtc: session.finishedAtUtc ?? null,
    title: session.name,
    notes: null,
    exerciseLogs: session.exercises.map((exercise, exerciseIndex) => ({
      exerciseId: exercise.exerciseId,
      order: exercise.order ?? exerciseIndex + 1,
      notes: null,
      sets: exercise.sets.map((set, setIndex) => ({
        setNumber: setIndex + 1,
        weightKg: set.weight ?? null,
        reps: set.reps ?? null,
        rir: null,
        distanceMeters: null,
        duration: null,
        setType: null,
        notes: null,
      })),
    })),
  };

  const res = await authFetch(
    `${API_BASE_URL}/workoutsession/complete`,
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
    throw new Error(text || "Kunne ikke lagre økten");
  }

  const saved: WorkoutSessionResponse = await res.json();
  return saved.id;
}

export async function putWorkoutSession(
  sessionId: string,
  session: WorkoutSession,
  token: string
) {
  const payload: UpdateWorkoutSessionRequest = {
    startedAtUtc: session.startedAtUtc ?? null,
    finishedAtUtc: session.finishedAtUtc ?? null,
    title: session.name ?? null,
    notes: null,
    exerciseLogs: session.exercises.map((ex, exIndex) => ({
      exerciseId: ex.exerciseId,
      order: ex.order ?? exIndex + 1,
      notes: null,
      sets: ex.sets.map((set, setIndex) => ({
        setNumber: setIndex + 1,
        weightKg: set.weight ?? null,
        reps: set.reps ?? null,
        rir: null,
        distanceMeters: null,
        duration: null,
        setType: null,
        notes: null,
      })),
    })),
  };

  const res = await authFetch(
    `${API_BASE_URL}/workoutsession/${sessionId}`,
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
    throw new Error(text || "Kunne ikke oppdatere økten");
  }
}

export async function deleteWorkoutSession(sessionId: string, token: string) {
  const res = await authFetch(
    `${API_BASE_URL}/workoutsession/${sessionId}`,
    {
      method: "DELETE",
      headers: {},
    },
    { token }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to delete session");
  }
}
