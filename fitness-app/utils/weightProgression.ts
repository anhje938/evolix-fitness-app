import { Weight } from "@/types/weight";



//Compares the relevant day with average of the previous 7 days
export function weeklyAverageProgression(weightList: Weight[], id: string) {
    const index = weightList.findIndex(w => w.id === id);
    if (index === -1) return null;
  

    const hasFullWeekBehind = index + 7 < weightList.length;
    if (!hasFullWeekBehind) return null;
  
    const todayWeight = weightList[index].weightKg;
  

    const window = weightList.slice(index + 1, index + 8);
  
    const sum = window.reduce((acc, w) => acc + w.weightKg, 0);
    const lastWeekAvg = sum / 7;
    const deviation = todayWeight - lastWeekAvg;
  
    return {
      todayWeight: Number(todayWeight.toFixed(1)),
      lastWeekAvg: Number(lastWeekAvg.toFixed(1)),
      deviation: Number(deviation.toFixed(1)),
    };
  }
  

