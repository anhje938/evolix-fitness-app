import {
  formatDateKeyWeekdayNO,
  getDateKeyEpochDay,
  getOsloTodayDateKey,
} from "@/utils/date";

export function getRelativeDateLabel(dateString: string) {
  const targetEpochDay = getDateKeyEpochDay(dateString);
  const todayEpochDay = getDateKeyEpochDay(getOsloTodayDateKey());

  if (targetEpochDay == null || todayEpochDay == null) return dateString;

  const diffDays = todayEpochDay - targetEpochDay;

  if (diffDays === 0) return "I dag";
  if (diffDays === 1) return "I går";

  if (diffDays >= 2 && diffDays <= 6) {
    return formatDateKeyWeekdayNO(dateString);
  }

  return dateString;
}
