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

export class AuthRequestError extends Error {
  status: number;
  code?: string;
  detail?: string;
  traceId?: string;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; detail?: string; traceId?: string },
  ) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
    this.code = options?.code;
    this.detail = options?.detail;
    this.traceId = options?.traceId;
  }
}

export type AuthSessionPayload = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
};

function parseErrorResponse(errorText: string): ErrorResponse {
  try {
    return JSON.parse(errorText) as ErrorResponse;
  } catch {
    return { detail: errorText };
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
    const parsed = parseErrorResponse(errorText);
    const message =
      parsed.detail ||
      parsed.error ||
      (res.status === 404
        ? "Auth endpoint was not found"
        : `Auth request failed with status: ${res.status}`);

    throw new AuthRequestError(res.status, message, {
      code: parsed.error,
      detail: parsed.detail,
      traceId: parsed.traceId,
    });
  }

  const data = (await res.json()) as AuthResponse;
  return normalizeAuthResponse(data);
}

export async function loginWithApple(
  idToken: string,
  authorizationCode?: string | null,
): Promise<AuthSessionPayload> {
  const normalizedToken = idToken.trim();
  const normalizedAuthorizationCode = authorizationCode?.trim() || null;
  const res = await fetch(`${API_BASE_URL}/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken: normalizedToken,
      authorizationCode: normalizedAuthorizationCode,
      identityToken: normalizedToken,
      token: normalizedToken,
    }),
  });

  return parseAuthResponse(res);
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthSessionPayload> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  return parseAuthResponse(res);
}

export async function registerWithPassword(
  email: string,
  username: string,
  password: string,
): Promise<AuthSessionPayload> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim(),
      username: username.trim(),
      password,
    }),
  });

  return parseAuthResponse(res);
}

export async function refreshWithToken(
  refreshToken: string,
): Promise<AuthSessionPayload> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  return parseAuthResponse(res);
}

export async function logoutWithRefreshToken(
  refreshToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (res.ok || res.status === 401) return;

  const errorText = await res.text().catch(() => "");
  const parsed = parseErrorResponse(errorText);
  throw new Error(
    parsed.detail || parsed.error || `Logout failed with status: ${res.status}`,
  );
}
