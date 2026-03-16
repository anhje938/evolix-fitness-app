import { API_BASE_URL } from "./baseUrl";

type AuthResponse = {
  jwt?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAtUtc?: string;
};

type ErrorResponse = {
  error?: string;
  detail?: string;
  traceId?: string;
};

export type AuthSessionPayload = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
};

function toErrorMessage(errorText: string): string {
  if (!errorText) return "";

  try {
    const parsed = JSON.parse(errorText) as ErrorResponse;
    return [
      parsed.error,
      parsed.detail,
      parsed.traceId ? `traceId=${parsed.traceId}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  } catch {
    return errorText;
  }
}

function normalizeAuthResponse(data: AuthResponse): AuthSessionPayload {
  const accessToken = data.accessToken?.trim() || data.jwt?.trim() || "";
  const refreshToken = data.refreshToken?.trim() || "";
  const accessTokenExpiresAtUtc = data.accessTokenExpiresAtUtc?.trim() || "";

  if (!accessToken) throw new Error("Auth response missing access token");
  if (!refreshToken) throw new Error("Auth response missing refresh token");
  if (!accessTokenExpiresAtUtc) {
    throw new Error("Auth response missing access token expiry");
  }

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAtUtc,
  };
}

async function parseAuthResponse(res: Response): Promise<AuthSessionPayload> {
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      toErrorMessage(errorText) || `Auth request failed with status: ${res.status}`
    );
  }

  const data = (await res.json()) as AuthResponse;
  return normalizeAuthResponse(data);
}

export async function loginWithApple(
  idToken: string
): Promise<AuthSessionPayload> {
  const normalizedToken = idToken.trim();
  const res = await fetch(`${API_BASE_URL}/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken: normalizedToken,
      identityToken: normalizedToken,
      token: normalizedToken,
    }),
  });

  return parseAuthResponse(res);
}

export async function refreshWithToken(
  refreshToken: string
): Promise<AuthSessionPayload> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  return parseAuthResponse(res);
}

export async function logoutWithRefreshToken(
  refreshToken: string
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (res.ok || res.status === 401) return;

  const errorText = await res.text().catch(() => "");
  throw new Error(
    toErrorMessage(errorText) || `Logout failed with status: ${res.status}`
  );
}
