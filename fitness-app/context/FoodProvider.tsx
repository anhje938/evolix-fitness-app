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

type RefreshMealsOptions = {
  force?: boolean;
};

type FoodContextValue = {
  foodList: Food[];
  setFoodList: React.Dispatch<React.SetStateAction<Food[]>>;
  todayTotals: TodayTotals;
  refreshMeals: (options?: RefreshMealsOptions) => Promise<Food[]>;
  isLoadingMeals: boolean;
};

const FoodContext = createContext<FoodContextValue | undefined>(undefined);

function sortFoodsByTimestampDesc(list: Food[]) {
  return [...list].sort(
    (a, b) =>
      new Date(b.timestampUtc).getTime() - new Date(a.timestampUtc).getTime()
  );
}

export function FoodProvider({ children }: { children: ReactNode }) {
  const [foodList, setFoodList] = useState<Food[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);

  const mountedRef = useRef(true);
  const refreshPromiseRef = useRef<Promise<Food[]> | null>(null);

  const { token, setToken } = useAuth();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runRefreshMeals = useCallback(async (): Promise<Food[]> => {
    setIsLoadingMeals(true);
    try {
      if (!token) {
        if (mountedRef.current) setFoodList([]);
        return [];
      }
      const data = await FetchUserMeals(token);
      const sortedData = sortFoodsByTimestampDesc(data);

      if (!mountedRef.current) return sortedData;
      setFoodList(sortedData);
      return sortedData;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        if (mountedRef.current) setFoodList([]);
        void setToken(null);
        return [];
      }
      console.log("Feil ved henting av meals:", error);
      return [];
    } finally {
      if (mountedRef.current) setIsLoadingMeals(false);
    }
  }, [setToken, token]);

  const refreshMeals = useCallback(
    async (options?: RefreshMealsOptions): Promise<Food[]> => {
      const activeRefresh = refreshPromiseRef.current;

      if (activeRefresh) {
        if (!options?.force) {
          return await activeRefresh;
        }

        await activeRefresh.catch(() => undefined);
      }

      const nextRefresh = runRefreshMeals();
      refreshPromiseRef.current = nextRefresh;

      try {
        return await nextRefresh;
      } finally {
        if (refreshPromiseRef.current === nextRefresh) {
          refreshPromiseRef.current = null;
        }
      }
    },
    [runRefreshMeals]
  );

  useEffect(() => {
    void refreshMeals();
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
