import { API_BASE_URL } from "@/api/baseUrl";
import { authFetch, getValidAccessToken } from "@/api/authSession";
import type {
  AdaptiveRecommendation,
  TodayFocus,
  WeeklyReport,
} from "@/types/adaptive";

export class AdaptiveApiError extends Error {
  status: number;
  code: string | null;
  detail: string | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    detail: string | null = null
  ) {
    super(message);
    this.name = "AdaptiveApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function isAdaptiveApiError(
  error: unknown
): error is AdaptiveApiError {
  return error instanceof AdaptiveApiError;
}

function parseAdaptiveErrorPayload(text: string) {
  if (!text.trim()) {
    return {
      message: null as string | null,
      code: null as string | null,
      detail: null as string | null,
    };
  }

  try {
    const parsed = JSON.parse(text) as {
      error?: unknown;
      message?: unknown;
      detail?: unknown;
      title?: unknown;
    };

    return {
      message:
        typeof parsed.message === "string"
          ? parsed.message
          : typeof parsed.title === "string"
            ? parsed.title
            : null,
      code: typeof parsed.error === "string" ? parsed.error : null,
      detail: typeof parsed.detail === "string" ? parsed.detail : null,
    };
  } catch {
    return {
      message: text.trim(),
      code: null as string | null,
      detail: null as string | null,
    };
  }
}

async function adaptiveFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}${path}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    },
    { token }
  );

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const parsedError = parseAdaptiveErrorPayload(text);
    throw new AdaptiveApiError(
      parsedError.message ?? `Adaptive request failed with status ${res.status}`,
      res.status,
      parsedError.code,
      parsedError.detail
    );
  }

  if (!text.trim()) return null as T;
  return JSON.parse(text) as T;
}

export function getTodayFocus(): Promise<TodayFocus> {
  return adaptiveFetch<TodayFocus>("/adaptive/today");
}

export function getCurrentWeeklyReport(): Promise<WeeklyReport> {
  return adaptiveFetch<WeeklyReport>("/adaptive/weekly-report/current");
}

export function getWeeklyReports(limit = 12): Promise<WeeklyReport[]> {
  return adaptiveFetch<WeeklyReport[]>(
    `/adaptive/weekly-reports?limit=${encodeURIComponent(limit)}`
  );
}

export function generateWeeklyReport(): Promise<WeeklyReport> {
  return adaptiveFetch<WeeklyReport>("/adaptive/weekly-report/generate", {
    method: "POST",
  });
}

export function regenerateWeeklyReport(): Promise<WeeklyReport> {
  return adaptiveFetch<WeeklyReport>("/adaptive/weekly-report/regenerate", {
    method: "POST",
  });
}

export function getAdaptiveRecommendations(): Promise<AdaptiveRecommendation[]> {
  return adaptiveFetch<AdaptiveRecommendation[]>("/adaptive/recommendations");
}

export function acceptAdaptiveRecommendation(
  recommendationId: string
): Promise<AdaptiveRecommendation> {
  return adaptiveFetch<AdaptiveRecommendation>(
    `/adaptive/recommendations/${recommendationId}/accept`,
    { method: "POST" }
  );
}

export function dismissAdaptiveRecommendation(
  recommendationId: string
): Promise<AdaptiveRecommendation> {
  return adaptiveFetch<AdaptiveRecommendation>(
    `/adaptive/recommendations/${recommendationId}/dismiss`,
    { method: "POST" }
  );
}
