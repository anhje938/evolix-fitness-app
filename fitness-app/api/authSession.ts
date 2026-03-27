import * as SecureStore from "expo-secure-store";
import {
  AuthRequestError,
  type AuthSessionPayload,
  logoutWithRefreshToken,
  refreshWithToken,
} from "./auth";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const ACCESS_TOKEN_EXPIRY_KEY = "auth_access_token_expires_at";
const LEGACY_TOKEN_KEY = "token";
const REFRESH_SKEW_MS = 60_000;

export type StoredAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAtUtc: string | null;
};

type AuthSessionListener = (session: StoredAuthSession | null) => void;

let currentSession: StoredAuthSession | null = null;
let hasLoadedSession = false;
let refreshPromise: Promise<StoredAuthSession | null> | null = null;
const listeners = new Set<AuthSessionListener>();

function emitSession(next: StoredAuthSession | null) {
  for (const listener of listeners) {
    listener(next);
  }
}

function normalizeIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload || typeof globalThis.atob !== "function") return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(globalThis.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readStringClaim(
  payload: Record<string, unknown> | null,
  claimNames: string[]
): string | null {
  if (!payload) return null;

  for (const claimName of claimNames) {
    const value = payload[claimName];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function decodeAccessExpiry(token: string): string | null {
  const payload = parseJwtPayload(token);
  const expSeconds = Number(payload?.exp);
  if (!Number.isFinite(expSeconds) || expSeconds <= 0) return null;
  return new Date(expSeconds * 1000).toISOString();
}

export function getAccessTokenUserId(
  token: string | null | undefined
): string | null {
  if (!token) return null;

  const payload = parseJwtPayload(token);
  return readStringClaim(payload, [
    "sub",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
    "nameidentifier",
    "nameid",
    "userId",
  ]);
}

function isAccessTokenFresh(session: StoredAuthSession | null): boolean {
  if (!session?.accessToken) return false;
  const expiresAt = normalizeIso(session.accessTokenExpiresAtUtc);
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() - Date.now() > REFRESH_SKEW_MS;
}

function shouldClearSessionOnRefreshError(error: unknown): boolean {
  if (!(error instanceof AuthRequestError)) return false;
  return error.status === 400 || error.status === 401 || error.status === 403;
}

async function persistSession(next: StoredAuthSession | null): Promise<void> {
  if (!next?.accessToken) {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(ACCESS_TOKEN_EXPIRY_KEY),
      SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
    ]);
    currentSession = null;
    hasLoadedSession = true;
    emitSession(null);
    return;
  }

  const normalized: StoredAuthSession = {
    accessToken: next.accessToken,
    refreshToken: next.refreshToken?.trim() || null,
    accessTokenExpiresAtUtc:
      normalizeIso(next.accessTokenExpiresAtUtc) ??
      decodeAccessExpiry(next.accessToken) ??
      null,
  };

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, normalized.accessToken),
    SecureStore.setItemAsync(LEGACY_TOKEN_KEY, normalized.accessToken),
    normalized.refreshToken
      ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, normalized.refreshToken)
      : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    normalized.accessTokenExpiresAtUtc
      ? SecureStore.setItemAsync(
          ACCESS_TOKEN_EXPIRY_KEY,
          normalized.accessTokenExpiresAtUtc
        )
      : SecureStore.deleteItemAsync(ACCESS_TOKEN_EXPIRY_KEY),
  ]);

  currentSession = normalized;
  hasLoadedSession = true;
  emitSession(normalized);
}

export async function loadStoredAuthSession(): Promise<StoredAuthSession | null> {
  if (hasLoadedSession) return currentSession;

  const [accessToken, legacyToken, refreshToken, accessTokenExpiresAtUtc] =
    await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(LEGACY_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(ACCESS_TOKEN_EXPIRY_KEY),
    ]);

  const resolvedAccessToken = accessToken ?? legacyToken;
  if (!resolvedAccessToken) {
    await persistSession(null);
    return null;
  }

  const session: StoredAuthSession = {
    accessToken: resolvedAccessToken,
    refreshToken: refreshToken ?? null,
    accessTokenExpiresAtUtc:
      normalizeIso(accessTokenExpiresAtUtc) ?? decodeAccessExpiry(resolvedAccessToken),
  };

  await persistSession(session);
  return currentSession;
}

export function subscribeAuthSession(listener: AuthSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function setStoredAuthSession(
  next: AuthSessionPayload | StoredAuthSession | null
): Promise<void> {
  await persistSession(
    next
      ? {
          accessToken: next.accessToken,
          refreshToken: next.refreshToken ?? null,
          accessTokenExpiresAtUtc: next.accessTokenExpiresAtUtc ?? null,
        }
      : null
  );
}

export async function clearStoredAuthSession(): Promise<void> {
  await persistSession(null);
}

export async function refreshStoredAuthSession(): Promise<StoredAuthSession | null> {
  const session = await loadStoredAuthSession();
  if (!session?.refreshToken) {
    if (session?.accessTokenExpiresAtUtc) {
      const expiresAt = new Date(session.accessTokenExpiresAtUtc).getTime();
      if (expiresAt <= Date.now()) {
        await clearStoredAuthSession();
        return null;
      }
    }
    return session;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshed = await refreshWithToken(session.refreshToken as string);
      await setStoredAuthSession(refreshed);
      return currentSession;
    } catch (error) {
      if (shouldClearSessionOnRefreshError(error)) {
        await clearStoredAuthSession();
        return null;
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getValidAccessToken(
  fallbackToken?: string | null
): Promise<string | null> {
  const session = await loadStoredAuthSession();
  const candidate =
    session?.accessToken || fallbackToken?.trim() || null;

  if (!candidate) return null;
  if (isAccessTokenFresh(session)) return session?.accessToken ?? candidate;

  try {
    const refreshed = await refreshStoredAuthSession();
    if (refreshed?.accessToken) return refreshed.accessToken;
  } catch (error) {
    if (session?.accessTokenExpiresAtUtc) {
      const expiresAt = new Date(session.accessTokenExpiresAtUtc).getTime();
      if (expiresAt > Date.now()) return session.accessToken;
    }
    throw error;
  }

  if (session?.accessTokenExpiresAtUtc) {
    const expiresAt = new Date(session.accessTokenExpiresAtUtc).getTime();
    if (expiresAt > Date.now()) return session.accessToken;
  }

  if (session) return null;
  return fallbackToken?.trim() || null;
}

function withAuthorization(
  headers: HeadersInit | undefined,
  accessToken: string | null
): Headers {
  const next = new Headers(headers ?? {});
  if (accessToken) {
    next.set("Authorization", `Bearer ${accessToken}`);
  } else {
    next.delete("Authorization");
  }
  return next;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options?: { token?: string | null; retryOnUnauthorized?: boolean }
): Promise<Response> {
  const accessToken = await getValidAccessToken(options?.token ?? null);
  const headers = withAuthorization(init.headers, accessToken);

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status !== 401 || options?.retryOnUnauthorized === false) {
    return response;
  }

  const refreshed = await refreshStoredAuthSession();
  if (!refreshed?.accessToken) {
    return response;
  }

  return fetch(input, {
    ...init,
    headers: withAuthorization(init.headers, refreshed.accessToken),
  });
}

export async function logoutCurrentSession(): Promise<void> {
  const session = await loadStoredAuthSession();

  try {
    if (session?.refreshToken) {
      await logoutWithRefreshToken(session.refreshToken);
    }
  } finally {
    await clearStoredAuthSession();
  }
}
