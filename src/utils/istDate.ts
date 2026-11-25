export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

function zoneOffsetMs(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );
  return asUtc - utcMs;
}

function startOfZonedDay(value: string, timeZone: string) {
  const [year, month, day] = value.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = zoneOffsetMs(utcGuess, timeZone);
  let utc = utcGuess - offset;
  const corrected = zoneOffsetMs(utc, timeZone);
  if (corrected !== offset) utc = utcGuess - corrected;
  return utc;
}

function calendarDate(value: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function todayIstInput(timeZone = DEFAULT_TIME_ZONE) {
  return calendarDate(Date.now(), timeZone);
}

export function dateInputFromIst(value: number | null, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "";
  return calendarDate(value, timeZone);
}

export function startOfIstDay(value: string, timeZone = DEFAULT_TIME_ZONE) {
  return startOfZonedDay(value, timeZone);
}

export function endOfIstDay(value: string, timeZone = DEFAULT_TIME_ZONE) {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return startOfZonedDay(next, timeZone) - 1;
}

export function formatIstDate(value: number | null, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "Open";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
}

export function formatIstDateTime(value: number | null, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "Open";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}
