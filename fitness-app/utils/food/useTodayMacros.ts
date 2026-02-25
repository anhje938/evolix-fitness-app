import { useMemo } from "react";
import { Food } from "@/types/meal";
import { groupMealsByDate } from "@/utils/food/groupFoodList";
import { calcTotalMacros } from "@/utils/food/calculateTotalMacros";

type MacroTotals = {
  totalCalories: number;
  totalProteins: number;
  totalCarbs: number;
  totalFats: number;
};

type UseTodayMacrosResult = {
  todayTotals: MacroTotals;
};

export function useTodayMacros(foodList: Food[]): UseTodayMacrosResult {
  return useMemo(() => {
    // Default empty totals
    const empty: MacroTotals = {
      totalCalories: 0,
      totalProteins: 0,
      totalCarbs: 0,
      totalFats: 0,
    };

    if (!foodList || foodList.length === 0) {
      return { todayTotals: empty };
    }

    const grouped = groupMealsByDate(foodList);

    const todayKey = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const todaysMeals = grouped[todayKey] ?? [];

    if (todaysMeals.length === 0) {
      return { todayTotals: empty };
    }

    const totals = calcTotalMacros(todaysMeals);

    return { todayTotals: totals };
  }, [foodList]);
}
