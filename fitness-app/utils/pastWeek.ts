import {
  formatDateKeyWeekday,
  getDateKeyEpochDay,
  getOsloTodayDateKey,
} from "@/utils/date";

export function getRelativeDateLabel(
  dateString: string,
  language: "nb" | "en" = "nb"
) {
  const targetEpochDay = getDateKeyEpochDay(dateString);
  const todayEpochDay = getDateKeyEpochDay(getOsloTodayDateKey());

  if (targetEpochDay == null || todayEpochDay == null) return dateString;

  const diffDays = todayEpochDay - targetEpochDay;

  if (diffDays === 0) return language === "en" ? "Today" : "I dag";
  if (diffDays === 1) return language === "en" ? "Yesterday" : "I går";

  if (diffDays >= 2 && diffDays <= 6) {
    return formatDateKeyWeekday(dateString, language);
  }

  return dateString;
}
