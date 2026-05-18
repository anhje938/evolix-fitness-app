import { API_BASE_URL } from "@/api/baseUrl";
import { authFetch, getValidAccessToken } from "@/api/authSession";
import type {
  ApplyCutRecommendationResult,
  CutReadiness,
  CutReport,
} from "@/types/cutIntelligence";

export async function getCurrentCutReport(): Promise<CutReport> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/cut-intelligence/current`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    { token }
  );

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text || `Cut Rapport feilet med status ${res.status}`);
  }
  if (!text.trim()) throw new Error("Cut Rapport returnerte tom rapport");

  return JSON.parse(text) as CutReport;
}

export async function getCutReadiness(): Promise<CutReadiness> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/cut-intelligence/readiness`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    { token }
  );

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text || `Cut readiness feilet med status ${res.status}`);
  }
  if (!text.trim()) throw new Error("Cut readiness returnerte tom respons");

  return JSON.parse(text) as CutReadiness;
}

export async function applyCutRecommendation(
  recommendationId: string
): Promise<ApplyCutRecommendationResult> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Mangler auth-token");

  const res = await authFetch(
    `${API_BASE_URL}/cut-intelligence/recommendations/apply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recommendationId }),
    },
    { token }
  );

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(text || `Kunne ikke bruke anbefaling (${res.status})`);
  }
  if (!text.trim()) throw new Error("Serveren returnerte tom respons");

  return JSON.parse(text) as ApplyCutRecommendationResult;
}
