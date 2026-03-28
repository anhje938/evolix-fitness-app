export const NORWEGIAN_LOCALE = "nb-NO";
export const NORWEGIAN_TIME_ZONE = "Europe/Oslo";

type DateInput = string | number | Date;

const osloDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: NORWEGIAN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const osloDateFormatter = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
  timeZone: NORWEGIAN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const osloDateLongFormatter = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
  timeZone: NORWEGIAN_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const osloDateTimeFormatter = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
  timeZone: NORWEGIAN_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const osloTimeFormatter = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
  timeZone: NORWEGIAN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const osloWeekdayFormatter = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
  timeZone: NORWEGIAN_TIME_ZONE,
  weekday: "long",
});

const osloShortDayMonthFormatter = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
  timeZone: NORWEGIAN_TIME_ZONE,
  day: "numeric",
  month: "short",
});

const osloMonthYearFormatter = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
  timeZone: NORWEGIAN_TIME_ZONE,
  month: "long",
  year: "numeric",
});

function toValidDate(input: DateInput): Date | null {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

function partsFromFormatter(input: DateInput) {
  const date = toValidDate(input);
  if (!date) return null;

  const parts = osloDatePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

export function dateKeyToUtcDate(dateKey: string): Date | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;

  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
}

export function getOsloDateKey(input: DateInput): string {
  const parts = partsFromFormatter(input);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getOsloTodayDateKey() {
  return getOsloDateKey(new Date());
}

export function formatTimeNO(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return "--:--";
  return osloTimeFormatter.format(date);
}

export function formatDateNO(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return "Ukjent";
  return osloDateFormatter.format(date);
}

export function formatDateLongNO(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return "Ukjent";
  return osloDateLongFormatter.format(date);
}

export function formatDateTimeNO(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return "Ukjent";
  return osloDateTimeFormatter.format(date);
}

export function formatWeekdayNO(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return "Ukjent";
  return osloWeekdayFormatter.format(date);
}

export function formatShortDayMonthNO(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return "Ukjent";
  return osloShortDayMonthFormatter.format(date);
}

export function formatMonthYearNO(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return "Ukjent";
  return osloMonthYearFormatter.format(date);
}

export function formatDateKeyNO(dateKey: string): string {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "Ukjent";
  return formatDateNO(date);
}

export function formatDateKeyLongNO(dateKey: string): string {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "Ukjent";
  return formatDateLongNO(date);
}

export function formatDateKeyWeekdayNO(dateKey: string): string {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return "Ukjent";
  return formatWeekdayNO(date);
}

export function getDateKeyEpochDay(dateKey: string): number | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;

  return Math.floor(Date.UTC(parsed.year, parsed.month - 1, parsed.day) / 86400000);
}

export function getIsoWeekYearAndNumberFromDateKey(dateKey: string) {
  const date = dateKeyToUtcDate(dateKey);
  if (!date) return null;

  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
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

export function parseISO(iso: string) {
  return {
    date: getOsloDateKey(iso),
    time: formatTimeNO(iso),
  };
}
