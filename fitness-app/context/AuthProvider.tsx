import {
  clearStoredAuthSession,
  getValidAccessToken,
  loadStoredAuthSession,
  logoutCurrentSession,
  setStoredAuthSession,
  subscribeAuthSession,
  type StoredAuthSession,
} from "@/api/authSession";
import type { AuthSessionPayload } from "@/api/auth";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthCtx = {
  token: string | null;
  authReady: boolean;
  setToken: (t: string | null) => Promise<void>;
  setAuthSession: (session: AuthSessionPayload | null) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

function toToken(session: StoredAuthSession | null): string | null {
  return session?.accessToken ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const stored = await loadStoredAuthSession();
        if (!alive) return;
        setTokenState(toToken(stored));
      } finally {
        if (alive) setAuthReady(true);
      }
    })();

    const unsubscribe = subscribeAuthSession((session) => {
      if (!alive) return;
      setTokenState(toToken(session));
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const setToken = async (nextToken: string | null) => {
    if (!nextToken) {
      await clearStoredAuthSession();
      return;
    }

    await setStoredAuthSession({
      accessToken: nextToken,
      refreshToken: null,
      accessTokenExpiresAtUtc: null,
    });
  };

  const setAuthSession = async (session: AuthSessionPayload | null) => {
    await setStoredAuthSession(session);
  };

  const refreshAccessToken = async () => {
    return getValidAccessToken();
  };

  const logout = async () => {
    await logoutCurrentSession();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        authReady,
        setToken,
        setAuthSession,
        refreshAccessToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
