// context/WeightProvider.tsx
import { getUserWeights } from "@/api/weight";
import { useAuth } from "@/context/AuthProvider";
import { Weight } from "@/types/weight";
import { isUnauthorizedError } from "@/utils/isUnauthorizedError";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type WeightContextValue = {
  weightList: Weight[];
  lastWeight: number | null;
  progressionLast7: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refreshWeights: () => Promise<void>;
};

const WeightContext = createContext<WeightContextValue | undefined>(undefined);

export function WeightProvider({ children }: { children: ReactNode }) {
  const { token, authReady, setToken } = useAuth(); // eneste kilden til token

  const [weightList, setWeightList] = useState<Weight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchWeights = useCallback(async () => {
    if (!authReady) return; // ✅ ikke prøv før vi har lest SecureStore
    if (!token) return; // ✅ ikke prøv uten token
    if (loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // 🔥 Viktig: getUserWeights bør bruke token (fra context),
      // ikke lese SecureStore inni seg.
      const data = await getUserWeights(token);

      if (!mountedRef.current) return;
      setWeightList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (isUnauthorizedError(err)) {
        setWeightList([]);
        setError(null);
        void setToken(null);
        return;
      }
      setError(err?.message ?? "Unknown error");
    } finally {
      if (mountedRef.current) setIsLoading(false);
      loadingRef.current = false;
    }
  }, [authReady, setToken, token]);

  // ✅ Trigger når auth er klar og token finnes (inkl etter login)
  useEffect(() => {
    fetchWeights();
  }, [fetchWeights]);

  const lastWeight = useMemo(
    () => (weightList.length ? weightList[0].weightKg : null),
    [weightList]
  );

  const progressionLast7 = useMemo(() => {
    if (weightList.length < 2) return 0;
    const latest = weightList[0].weightKg;
    const index = Math.min(6, weightList.length - 1);
    const sevenAgo = weightList[index].weightKg;
    return latest - sevenAgo;
  }, [weightList]);

  return (
    <WeightContext.Provider
      value={{
        weightList,
        lastWeight,
        progressionLast7,
        isLoading,
        error,
        refetch: fetchWeights,
        refreshWeights: fetchWeights,
      }}
    >
      {children}
    </WeightContext.Provider>
  );
}

export function useWeightContext() {
  const ctx = useContext(WeightContext);
  if (!ctx)
    throw new Error("useWeightContext must be used inside <WeightProvider>");
  return ctx;
}

