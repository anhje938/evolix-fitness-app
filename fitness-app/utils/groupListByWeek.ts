import { Weight } from "@/types/weight";

function getISOWeekYearAndNumber(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNumber = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNumber = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return { year: isoYear, week: weekNumber };
}

export function getWeeklySummary(weightList: Weight[]) {
  const weekMap = new Map<
    string,
    { year: number; week: number; sum: number; count: number }
  >();

  for (const entry of weightList) {
    const date = new Date(entry.timestampUtc);
    const { year, week } = getISOWeekYearAndNumber(date);
    const key = `${year}-${week}`;

    const weekData = weekMap.get(key);
    if (!weekData) {
      weekMap.set(key, { year, week, sum: entry.weightKg, count: 1 });
    } else {
      weekData.sum += entry.weightKg;
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
