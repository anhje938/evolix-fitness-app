import { Food } from "@/types/meal";
import { calcTotalMacros } from "./calculateTotalMacros";

// DAILY: eksisterende funksjon (uendret)
export function groupMealsByDate(meals: Food[]) {
  return meals.reduce((acc, meal) => {
    const dateKey = meal.timestampUtc.split("T")[0]; // "2025-02-03"

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(meal);
    return acc;
  }, {} as Record<string, Food[]>);
}

// ===== NYTT: UKEBASERT LOGIKK =====

// Hjelper: ISO-ukenummer (standardisert uke-beregning)
function getISOWeek(date: Date): number {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);

  // Torsdag i uken definerer uke-nummer
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));

  // Uke 1 er uken med 4. januar
  const week1 = new Date(tmp.getFullYear(), 0, 4);

  return (
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

// Grupperer måltider per uke: "2025-U06" => Meal[]
export function groupMealsByWeek(meals: Food[]) {
  return meals.reduce((acc, meal) => {
    const dateObj = new Date(meal.timestampUtc);
    const year = dateObj.getFullYear();
    const week = getISOWeek(dateObj);

    const weekKey = `${year}-U${String(week).padStart(2, "0")}`; // f.eks "2025-U06"

    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(meal);

    return acc;
  }, {} as Record<string, Food[]>);
}

// Typen for weekly summary
export type WeeklyMacroTotals = {
  weekKey: string;        // "2025-U06"
  year: number;           // 2025
  week: number;           // 6
  weekLabel: string;      // "Uke 6, 2025"
  totalCalories: number;
  totalProteins: number;
  totalCarbs: number;
  totalFats: number;
};

// Lager en ferdig weekly-oversikt med summerte macros per uke
export function getWeeklyMacroTotals(meals: Food[]): WeeklyMacroTotals[] {
  const grouped = groupMealsByWeek(meals);

  const summaries: WeeklyMacroTotals[] = Object.entries(grouped).map(
    ([weekKey, weekMeals]) => {
      const totals = calcTotalMacros(weekMeals); // gjenbruker utilen din

      const [yearStr, weekPart] = weekKey.split("-U");
      const year = Number(yearStr);
      const week = Number(weekPart);

      const weekLabel = `Uke ${week}, ${year}`;

      return {
        weekKey,
        year,
        week,
        weekLabel,
        totalCalories: totals.totalCalories,
        totalProteins: totals.totalProteins,
        totalCarbs: totals.totalCarbs,
        totalFats: totals.totalFats,
      };
    }
  );

  // Sortér nyeste uke først
  summaries.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });

  return summaries;
}
