import type {
  SessionExercise,
  SessionMode,
  SessionSet,
  WorkoutSession,
} from "@/types/exercise";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const STORAGE_VERSION = 1;
const STORAGE_KEY = "active_workout_session";
const LEGACY_FILE_NAME = "active-workout-session.json";
const LEGACY_FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${LEGACY_FILE_NAME}`
  : null;

type PersistedActiveWorkoutSession = {
  version: number;
  isMinimized: boolean;
  session: WorkoutSession;
};

let storageQueue: Promise<void> = Promise.resolve();

function enqueueStorageOp(operation: () => Promise<void>) {
  storageQueue = storageQueue.catch(() => {}).then(operation);
  return storageQueue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function readIsoString(value: unknown): string | null {
  const parsed = readString(value);
  if (!parsed) return null;
  return Number.isNaN(Date.parse(parsed)) ? null : parsed;
}

function readSessionMode(value: unknown): SessionMode | null {
  return value === "quick" || value === "program" ? value : null;
}

function parseSessionSet(value: unknown): SessionSet | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  const reps = readNullableNumber(value.reps);
  const weight = readNullableNumber(value.weight);
  const completed = readBoolean(value.completed);

  if (!id || reps === undefined || weight === undefined || completed === null) {
    return null;
  }

  return {
    id,
    reps,
    weight,
    completed,
  };
}

function parseSessionExercise(
  value: unknown,
  fallbackOrder: number
): SessionExercise | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  const exerciseId = readString(value.exerciseId);
  const name = readString(value.name);
  const muscle = readOptionalString(value.muscle);
  const parsedOrder = readNullableNumber(value.order);
  const rawSets = Array.isArray(value.sets) ? value.sets : null;

  if (!id || !exerciseId || !name || muscle === undefined || !rawSets) {
    return null;
  }

  const sets = rawSets
    .map(parseSessionSet)
    .filter((set): set is SessionSet => set !== null);

  return {
    id,
    exerciseId,
    name,
    muscle,
    order: parsedOrder ?? fallbackOrder,
    sets,
  };
}

function parseWorkoutSession(value: unknown): WorkoutSession | null {
  if (!isRecord(value)) return null;

  const mode = readSessionMode(value.mode);
  const name = readString(value.name);
  const startedAtUtc = readIsoString(value.startedAtUtc);
  const finishedAtUtc = readOptionalString(value.finishedAtUtc);
  const id = readOptionalString(value.id);
  const clientRequestId = readOptionalString(value.clientRequestId);
  const workoutProgramId = readOptionalString(value.workoutProgramId);
  const workoutId = readOptionalString(value.workoutId);
  const rawExercises = Array.isArray(value.exercises) ? value.exercises : null;

  if (
    !mode ||
    !name ||
    !startedAtUtc ||
    finishedAtUtc === undefined ||
    workoutProgramId === undefined ||
    workoutId === undefined ||
    !rawExercises
  ) {
    return null;
  }

  const normalizedFinishedAtUtc =
    finishedAtUtc === null ? null : readIsoString(finishedAtUtc);

  if (finishedAtUtc !== null && !normalizedFinishedAtUtc) {
    return null;
  }

  const exercises = rawExercises
    .map((exercise, index) => parseSessionExercise(exercise, index + 1))
    .filter((exercise): exercise is SessionExercise => exercise !== null)
    .sort((a, b) => a.order - b.order);

  return {
    id: id ?? undefined,
    clientRequestId: clientRequestId ?? null,
    mode,
    name,
    workoutProgramId,
    workoutId,
    startedAtUtc,
    finishedAtUtc: normalizedFinishedAtUtc,
    exercises,
  };
}

function parsePersistedActiveWorkoutSession(
  value: unknown
): PersistedActiveWorkoutSession | null {
  if (!isRecord(value)) return null;

  const version =
    typeof value.version === "number" && Number.isFinite(value.version)
      ? value.version
      : null;
  const isMinimized = readBoolean(value.isMinimized);
  const session = parseWorkoutSession(value.session);

  if (
    version !== STORAGE_VERSION ||
    isMinimized === null ||
    !session ||
    session.finishedAtUtc
  ) {
    return null;
  }

  return {
    version,
    isMinimized,
    session,
  };
}

function toScopeSlug(scopeKey: string): string {
  const slug = scopeKey.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
  return slug.length > 0 ? slug : "default";
}

function getScopedStorageKey(scopeKey: string): string {
  return `${STORAGE_KEY}:${scopeKey}`;
}

function getScopedFileUri(scopeKey: string): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}active-workout-session-${toScopeSlug(
    scopeKey
  )}.json`;
}

async function readRawStoredSession(scopeKey: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(getScopedStorageKey(scopeKey)) ?? null;
    } catch {
      return null;
    }
  }

  const scopedFileUri = getScopedFileUri(scopeKey);
  if (!scopedFileUri) return null;

  const info = await FileSystem.getInfoAsync(scopedFileUri);
  if (!info.exists) return null;

  return FileSystem.readAsStringAsync(scopedFileUri);
}

async function readLegacyRawStoredSession(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  if (!LEGACY_FILE_URI) return null;

  const info = await FileSystem.getInfoAsync(LEGACY_FILE_URI);
  if (!info.exists) return null;

  return FileSystem.readAsStringAsync(LEGACY_FILE_URI);
}

async function writeRawStoredSession(
  scopeKey: string,
  contents: string
): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(getScopedStorageKey(scopeKey), contents);
    return;
  }

  const scopedFileUri = getScopedFileUri(scopeKey);
  if (!scopedFileUri) return;

  await FileSystem.writeAsStringAsync(scopedFileUri, contents);
}

async function deleteRawStoredSession(scopeKey: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(getScopedStorageKey(scopeKey));
    return;
  }

  const scopedFileUri = getScopedFileUri(scopeKey);
  if (!scopedFileUri) return;

  await FileSystem.deleteAsync(scopedFileUri, { idempotent: true });
}

async function deleteLegacyRawStoredSession(): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return;
  }

  if (!LEGACY_FILE_URI) return;

  await FileSystem.deleteAsync(LEGACY_FILE_URI, { idempotent: true });
}

export async function loadStoredActiveWorkoutSession(
  scopeKey: string
): Promise<PersistedActiveWorkoutSession | null> {
  try {
    const raw = await readRawStoredSession(scopeKey);
    if (raw) {
      const parsed = parsePersistedActiveWorkoutSession(JSON.parse(raw));
      if (parsed) return parsed;

      await clearStoredActiveWorkoutSession(scopeKey);
      return null;
    }

    const legacyRaw = await readLegacyRawStoredSession();
    if (!legacyRaw) return null;

    const legacyParsed = parsePersistedActiveWorkoutSession(JSON.parse(legacyRaw));
    if (!legacyParsed) {
      await deleteLegacyRawStoredSession();
      return null;
    }

    await saveStoredActiveWorkoutSession({
      scopeKey,
      isMinimized: legacyParsed.isMinimized,
      session: legacyParsed.session,
    });
    await deleteLegacyRawStoredSession();
    return legacyParsed;
  } catch (error) {
    if (__DEV__) console.log("Failed to load stored workout session", error);
    await clearStoredActiveWorkoutSession(scopeKey).catch(() => {});
    await deleteLegacyRawStoredSession().catch(() => {});
    return null;
  }
}

export function saveStoredActiveWorkoutSession(args: {
  scopeKey: string;
  isMinimized: boolean;
  session: WorkoutSession;
}) {
  return enqueueStorageOp(async () => {
    await writeRawStoredSession(
      args.scopeKey,
      JSON.stringify({
        version: STORAGE_VERSION,
        isMinimized: args.isMinimized,
        session: args.session,
      } satisfies PersistedActiveWorkoutSession)
    );
  });
}

export function clearStoredActiveWorkoutSession(scopeKey: string) {
  return enqueueStorageOp(async () => {
    await deleteRawStoredSession(scopeKey);
  });
}
