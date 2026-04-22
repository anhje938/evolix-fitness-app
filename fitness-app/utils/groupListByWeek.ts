import {
  getIsoWeekYearAndNumberFromDateKey,
  getOsloDateKey,
} from "@/utils/date";
import { Weight } from "@/types/weight";
import { calculateWeightTrendSeries } from "@/utils/weightTrend";

export function getWeeklySummary(weightList: Weight[]) {
  const trendSeries = calculateWeightTrendSeries(weightList);
  const weekMap = new Map<
    string,
    { year: number; week: number; sum: number; count: number }
  >();

  for (const entry of trendSeries) {
    const dateKey = getOsloDateKey(entry.timestampUtc);
    if (!dateKey) continue;

    const isoWeek = getIsoWeekYearAndNumberFromDateKey(dateKey);
    if (!isoWeek) continue;

    const key = `${isoWeek.year}-${isoWeek.week}`;
    const weekData = weekMap.get(key);

    if (!weekData) {
      weekMap.set(key, {
        year: isoWeek.year,
        week: isoWeek.week,
        sum: entry.trendWeightKg,
        count: 1,
      });
    } else {
      weekData.sum += entry.trendWeightKg;
      weekData.count += 1;
    }
  }

  const baseList = Array.from(weekMap.entries())
    .map(([key, data]) => ({
      id: key,
      year: data.year,
      week: data.week,
      weekLabel: `Uke ${data.week} (${data.year})`,
      avgWeight: Number((data.sum / data.count).toFixed(1)),
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });

  return baseList.map((week, index) => {
    const previous = baseList[index + 1];
    const difference = previous
      ? Number((week.avgWeight - previous.avgWeight).toFixed(1))
      : null;

    return { ...week, difference };
  });
}
