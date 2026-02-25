// context/AuthProvider.tsx
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthCtx = {
  token: string | null;
  authReady: boolean; // ✅ vi vet om vi har sjekket SecureStore
  setToken: (t: string | null) => void; // kall etter login/logout
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync("token");
        if (!alive) return;
        setTokenState(stored ?? null);
      } finally {
        if (alive) setAuthReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const setToken = async (t: string | null) => {
    if (t) await SecureStore.setItemAsync("token", t);
    else await SecureStore.deleteItemAsync("token");
    setTokenState(t);
  };

  return (
    <AuthContext.Provider value={{ token, authReady, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
