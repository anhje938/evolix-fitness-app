import { FetchUserMeals } from "@/api/food";
import { Food } from "@/types/meal";
import { isUnauthorizedError } from "@/utils/isUnauthorizedError";
import { useTodayMacros } from "@/utils/food/useTodayMacros";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";

type TodayTotals = {
  totalCalories: number;
  totalProteins: number;
  totalCarbs: number;
  totalFats: number;
};

type FoodContextValue = {
  foodList: Food[];
  setFoodList: React.Dispatch<React.SetStateAction<Food[]>>;
  todayTotals: TodayTotals;
  refreshMeals: () => Promise<void>;
  isLoadingMeals: boolean;
};

const FoodContext = createContext<FoodContextValue | undefined>(undefined);

export function FoodProvider({ children }: { children: ReactNode }) {
  const [foodList, setFoodList] = useState<Food[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false); // ✅ lås mot parallelle fetches

  const { token, setToken } = useAuth();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshMeals = useCallback(async () => {
    if (inFlightRef.current) return; // ✅ stopper spam
    inFlightRef.current = true;

    setIsLoadingMeals(true);
    try {
      if (!token) {
        if (mountedRef.current) setFoodList([]);
        return;
      }
      const data = await FetchUserMeals(token);

      if (!mountedRef.current) return;
      setFoodList(data);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        if (mountedRef.current) setFoodList([]);
        void setToken(null);
        return;
      }
      console.log("Feil ved henting av meals:", error);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setIsLoadingMeals(false);
    }
  }, [setToken, token]);

  useEffect(() => {
    refreshMeals(); // ✅ kjører EN gang på mount
  }, [refreshMeals]);

  const { todayTotals } = useTodayMacros(foodList);

  return (
    <FoodContext.Provider
      value={{
        foodList,
        setFoodList,
        todayTotals,
        refreshMeals,
        isLoadingMeals,
      }}
    >
      {children}
    </FoodContext.Provider>
  );
}

export function useFoodContext() {
  const ctx = useContext(FoodContext);
  if (!ctx) {
    throw new Error("useFoodContext must be used inside <FoodProvider>");
  }
  return ctx;
}
