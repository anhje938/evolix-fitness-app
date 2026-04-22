import { Weight } from "@/types/weight";



// Compares the relevant measurement against up to the previous 7 measurements.
// Before a full 7-measurement window exists, we use the available history so
// the trend can still be shown from measurement 2 onward.
export function weeklyAverageProgression(weightList: Weight[], id: string) {
  const index = weightList.findIndex((w) => w.id === id);
  if (index === -1) return null;

  const todayWeight = weightList[index]?.weightKg;
  if (!Number.isFinite(todayWeight)) return null;

  const availableHistoryCount = weightList.length - (index + 1);
  const sampleSize = Math.min(7, availableHistoryCount);
  if (sampleSize < 1) return null;

  const window = weightList.slice(index + 1, index + 1 + sampleSize);
  const sum = window.reduce((acc, w) => acc + w.weightKg, 0);
  const lastWeekAvg = sum / sampleSize;
  const deviation = todayWeight - lastWeekAvg;

  return {
    todayWeight: Number(todayWeight.toFixed(1)),
    lastWeekAvg: Number(lastWeekAvg.toFixed(1)),
    deviation: Number(deviation.toFixed(1)),
  };
}

