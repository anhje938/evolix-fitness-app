import {
  ComposedMeal,
  ComposedMealHistoryItem,
  Food,
  FoodDto,
  FoodFromBarcode,
  LogComposedMealDto,
  RelogComposedMealHistoryDto,
  UpsertComposedMealDto,
} from "@/types/meal";
import { authFetch } from "./authSession";
import { API_BASE_URL } from "./baseUrl";

function parseJsonText<T>(text: string): T {
  if (!text) throw new Error("Server returned empty response body");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Server returned invalid JSON response");
  }
}

async function ensureOk(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const suffix = res.url ? ` (${res.url})` : "";
    throw new Error(text || `Request failed: ${res.status}${suffix}`);
  }
  return text;
}

function authHeaders(json = false): HeadersInit {
  if (json) {
    return {
      "Content-Type": "application/json",
    };
  }
  return {};
}

const BARCODE_FETCH_TIMEOUT_MS = 25000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = BARCODE_FETCH_TIMEOUT_MS,
  token?: string
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await authFetch(
      input,
      {
        ...init,
        signal: controller.signal,
      },
      { token }
    );
  } finally {
    clearTimeout(timer);
  }
}

function barcodeCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const out: string[] = [];
  const push = (value: string) => {
    if (value && !out.includes(value)) out.push(value);
  };

  const chunks = trimmed.match(/\d{8,14}/g) ?? [];
  chunks.sort((a, b) => b.length - a.length);
  for (const chunk of chunks) push(chunk);

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length >= 8 && digitsOnly.length <= 14) {
    push(digitsOnly);
  }

  push(trimmed);
  return out.slice(0, 2);
}

function clampInt(value: unknown, max = 20000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Math.round(n));
}

function clampDecimal(value: unknown, max = 99999): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, Number(n.toFixed(2)));
}

function normalizeUpsertComposedMealDto(
  dto: UpsertComposedMealDto
): UpsertComposedMealDto {
  return {
    name: String(dto.name ?? "").trim(),
    isFavorite: !!dto.isFavorite,
    ingredients: (dto.ingredients ?? []).map((ing, idx) => ({
      name: String(ing.name ?? "").trim(),
      amountGrams: clampDecimal(ing.amountGrams),
      calories: clampInt(ing.calories),
      proteins: clampInt(ing.proteins),
      carbs: clampInt(ing.carbs),
      fats: clampInt(ing.fats),
      sortOrder: Number.isFinite(ing.sortOrder)
        ? Math.max(0, Math.trunc(ing.sortOrder))
        : idx,
    })),
  };
}

// GET ALL USER MEALS
export async function FetchUserMeals(token: string): Promise<Food[]> {
  if (!token) return [];

  const res = await authFetch(
    `${API_BASE_URL}/food`,
    {
    method: "GET",
    headers: authHeaders(true),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<Food[]>(text);
}

// POST QUICK-ADD MEAL BY USER
export async function PostUserMeal(token: string, dto: FoodDto): Promise<Food> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/food`,
    {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(dto),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<Food>(text);
}

// SEND BARCODE TO BACKEND, RECEIVE FOOD
export async function FetchFoodFromBarcode(
  token: string,
  barcode: string
): Promise<FoodFromBarcode> {
  if (!token) throw new Error("Missing token");
  const candidates = barcodeCandidates(barcode);
  if (candidates.length === 0) throw new Error("Missing barcode");

  let lastRecoverableError: Error | null = null;

  for (const candidate of candidates) {
    const safeBarcode = encodeURIComponent(candidate);
    let res: Response;
    let text = "";

    try {
      res = await fetchWithTimeout(
        `${API_BASE_URL}/food/scan/${safeBarcode}`,
        {
          headers: authHeaders(),
        },
        BARCODE_FETCH_TIMEOUT_MS,
        token
      );
      text = await res.text().catch(() => "");
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Barcode lookup timed out"
          : error instanceof Error
            ? error.message
            : "Network error";
      lastRecoverableError = new Error(message);
      continue;
    }

    if (res.ok) {
      return parseJsonText<FoodFromBarcode>(text);
    }

    // Retry on candidate mismatch / lookup mismatch.
    if (res.status === 400 || res.status === 404 || res.status >= 500) {
      lastRecoverableError = new Error(text || `Request failed: ${res.status}`);
      continue;
    }

    throw new Error(text || `Request failed: ${res.status}`);
  }

  throw lastRecoverableError ?? new Error("Product not found");
}

export async function DeleteUserMeal(token: string, mealId: string): Promise<void> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/food/${mealId}`,
    {
    method: "DELETE",
    headers: authHeaders(),
    },
    { token }
  );

  await ensureOk(res);
}

export async function UpdateUserMeal(
  token: string,
  mealId: string,
  dto: FoodDto
): Promise<Food> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/food/${mealId}`,
    {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(dto),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<Food>(text);
}

// GET COMPOSED MEALS
export async function FetchComposedMeals(token: string): Promise<ComposedMeal[]> {
  if (!token) return [];

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals`,
    {
    method: "GET",
    headers: authHeaders(),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<ComposedMeal[]>(text);
}

// CREATE COMPOSED MEAL
export async function CreateComposedMeal(
  token: string,
  dto: UpsertComposedMealDto
): Promise<ComposedMeal> {
  if (!token) throw new Error("Missing token");
  const payload = normalizeUpsertComposedMealDto(dto);

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals`,
    {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<ComposedMeal>(text);
}

// UPDATE COMPOSED MEAL
export async function UpdateComposedMeal(
  token: string,
  composedMealId: string,
  dto: UpsertComposedMealDto
): Promise<ComposedMeal> {
  if (!token) throw new Error("Missing token");
  const payload = normalizeUpsertComposedMealDto(dto);

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals/${composedMealId}`,
    {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<ComposedMeal>(text);
}

// DELETE COMPOSED MEAL
export async function DeleteComposedMeal(
  token: string,
  composedMealId: string
): Promise<void> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals/${composedMealId}`,
    {
    method: "DELETE",
    headers: authHeaders(),
    },
    { token }
  );

  await ensureOk(res);
}

// PATCH favorite state
export async function SetComposedMealFavorite(
  token: string,
  composedMealId: string,
  isFavorite: boolean
): Promise<ComposedMeal> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals/${composedMealId}/favorite`,
    {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ isFavorite }),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<ComposedMeal>(text);
}

// LOG composed meal as a normal food entry
export async function LogComposedMeal(
  token: string,
  composedMealId: string,
  dto: LogComposedMealDto
): Promise<Food> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals/${composedMealId}/log`,
    {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(dto),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<Food>(text);
}

// GET composed-meal history rows
export async function FetchComposedMealHistory(
  token: string,
  limit = 25
): Promise<ComposedMealHistoryItem[]> {
  if (!token) return [];

  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 25;

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals/history?limit=${safeLimit}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<ComposedMealHistoryItem[]>(text);
}

// QUICK relog from history
export async function RelogComposedMealFromHistory(
  token: string,
  foodLogId: string,
  dto: RelogComposedMealHistoryDto
): Promise<Food> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/food/composed-meals/history/${foodLogId}/relog`,
    {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(dto),
    },
    { token }
  );

  const text = await ensureOk(res);
  return parseJsonText<Food>(text);
}
