import { API_BASE_URL } from "@/api/baseUrl";
import { authFetch, getValidAccessToken } from "@/api/authSession";
import type {
  AdaptiveRecommendation,
  TodayFocus,
  WeeklyReport,
} from "@/types/adaptive";

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
    throw new Error(text || `Adaptive request failed with status ${res.status}`);
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
