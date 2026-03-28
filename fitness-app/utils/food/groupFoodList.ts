import { Food } from "@/types/meal";
import {
  getIsoWeekYearAndNumberFromDateKey,
  getOsloDateKey,
} from "@/utils/date";
import { calcTotalMacros } from "./calculateTotalMacros";

// DAILY: grupperer etter Oslo-dato for korrekt "i dag"-visning
export function groupMealsByDate(meals: Food[]) {
  return meals.reduce((acc, meal) => {
    const dateKey = getOsloDateKey(meal.timestampUtc);
    if (!dateKey) return acc;

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(meal);
    return acc;
  }, {} as Record<string, Food[]>);
}

// WEEKLY: grupperer mÃ¥ltider per ISO-uke basert pÃ¥ Oslo-dato
export function groupMealsByWeek(meals: Food[]) {
  return meals.reduce((acc, meal) => {
    const dateKey = getOsloDateKey(meal.timestampUtc);
    if (!dateKey) return acc;

    const isoWeek = getIsoWeekYearAndNumberFromDateKey(dateKey);
    if (!isoWeek) return acc;

    const weekKey = `${isoWeek.year}-U${String(isoWeek.week).padStart(2, "0")}`;

    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(meal);

    return acc;
  }, {} as Record<string, Food[]>);
}

export type WeeklyMacroTotals = {
  weekKey: string;
  year: number;
  week: number;
  weekLabel: string;
  totalCalories: number;
  totalProteins: number;
  totalCarbs: number;
  totalFats: number;
};

export function getWeeklyMacroTotals(meals: Food[]): WeeklyMacroTotals[] {
  const grouped = groupMealsByWeek(meals);

  const summaries: WeeklyMacroTotals[] = Object.entries(grouped).map(
    ([weekKey, weekMeals]) => {
      const totals = calcTotalMacros(weekMeals);

      const [yearStr, weekPart] = weekKey.split("-U");
      const year = Number(yearStr);
      const week = Number(weekPart);

      return {
        weekKey,
        year,
        week,
        weekLabel: `Uke ${week}, ${year}`,
        totalCalories: totals.totalCalories,
        totalProteins: totals.totalProteins,
        totalCarbs: totals.totalCarbs,
        totalFats: totals.totalFats,
      };
    }
  );

  summaries.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });

  return summaries;
}
