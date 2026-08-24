export const TIME_ZONE = "Asia/Tokyo";

export const DEFAULT_SCHEDULE = Object.freeze([
  { id: "period-1", label: "1限", start: "08:40", end: "10:10", enabled: true },
  { id: "period-2", label: "2限", start: "10:30", end: "12:00", enabled: true },
  { id: "period-3", label: "3限", start: "13:00", end: "14:30", enabled: true },
  { id: "period-4", label: "4限", start: "14:50", end: "16:20", enabled: true },
  { id: "period-5", label: "5限", start: "16:40", end: "18:10", enabled: true },
  { id: "period-6", label: "6限", start: "18:30", end: "20:00", enabled: true },
]);

export const DEFAULT_ACTIVE_DAYS = Object.freeze([1, 2, 3, 4, 5]);

const tokyoFormatter = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function isValidTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value))) return false;
  const [hour, minute] = String(value).split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function timeToMinutes(value) {
  if (!isValidTime(value)) return Number.NaN;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(value) {
  const minutes = Math.max(0, Math.min(23 * 60 + 59, Math.round(Number(value) || 0)));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function makeId(index) {
  return `period-${index + 1}`;
}

export function normalizeSchedule(value) {
  const source = Array.isArray(value) && value.length ? value : DEFAULT_SCHEDULE;
  return source.slice(0, 12).map((item, index) => {
    const fallback = DEFAULT_SCHEDULE[index] || {
      label: `${index + 1}限`,
      start: minutesToTime(8 * 60 + 40 + index * 110),
      end: minutesToTime(10 * 60 + 10 + index * 110),
      enabled: true,
    };
    return {
      id: typeof item?.id === "string" && item.id ? item.id : makeId(index),
      label: typeof item?.label === "string" && item.label.trim() ? item.label.trim().slice(0, 12) : fallback.label,
      start: isValidTime(item?.start) ? item.start : fallback.start,
      end: isValidTime(item?.end) ? item.end : fallback.end,
      enabled: typeof item?.enabled === "boolean" ? item.enabled : fallback.enabled,
    };
  });
}

export function normalizeActiveDays(value) {
  if (!Array.isArray(value)) return [...DEFAULT_ACTIVE_DAYS];
  return [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
}

export function getTokyoParts(epochMs) {
  const fields = Object.fromEntries(
    tokyoFormatter.formatToParts(new Date(epochMs)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  const dateKey = `${fields.year}-${fields.month}-${fields.day}`;
  const weekday = new Date(Date.UTC(Number(fields.year), Number(fields.month) - 1, Number(fields.day))).getUTCDay();
  return {
    dateKey,
    weekday,
    year: Number(fields.year),
    month: Number(fields.month),
    day: Number(fields.day),
    hour: Number(fields.hour),
    minute: Number(fields.minute),
    second: Number(fields.second),
    clock: `${fields.hour}:${fields.minute}:${fields.second}`,
  };
}

export function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

export function eventEpoch(dateKey, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !isValidTime(time)) return Number.NaN;
  return Date.parse(`${dateKey}T${time}:00+09:00`);
}

export function getPeriodValidationCode(period) {
  if (!period?.enabled) return "";
  if (!period.label.trim()) return "labelRequired";
  if (!isValidTime(period.start) || !isValidTime(period.end)) return "timeRequired";
  if (timeToMinutes(period.start) >= timeToMinutes(period.end)) return "startBeforeEnd";
  return "";
}

export function validatePeriod(period) {
  const messages = {
    labelRequired: "名称を入力してください",
    timeRequired: "時刻を入力してください",
    startBeforeEnd: "開始は終了より前にしてください",
  };
  return messages[getPeriodValidationCode(period)] || "";
}

export function buildEventsForDate(schedule, dateKey, activeDays) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (!normalizeActiveDays(activeDays).includes(weekday)) return [];

  return normalizeSchedule(schedule)
    .filter((period) => period.enabled && !validatePeriod(period))
    .flatMap((period) => [
      {
        key: `${dateKey}|${period.id}|start|${period.start}`,
        dateKey,
        periodId: period.id,
        label: period.label,
        kind: "start",
        time: period.start,
        atMs: eventEpoch(dateKey, period.start),
      },
      {
        key: `${dateKey}|${period.id}|end|${period.end}`,
        dateKey,
        periodId: period.id,
        label: period.label,
        kind: "end",
        time: period.end,
        atMs: eventEpoch(dateKey, period.end),
      },
    ])
    .sort((a, b) => a.atMs - b.atMs || a.kind.localeCompare(b.kind));
}

export function getUpcomingEvent(schedule, nowMs, activeDays, daysAhead = 8) {
  const { dateKey } = getTokyoParts(nowMs);
  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const candidateDate = addDaysToDateKey(dateKey, offset);
    const event = buildEventsForDate(schedule, candidateDate, activeDays).find((item) => item.atMs > nowMs + 250);
    if (event) return event;
  }
  return null;
}

export function getCurrentPeriod(schedule, nowMs, activeDays) {
  const parts = getTokyoParts(nowMs);
  if (!normalizeActiveDays(activeDays).includes(parts.weekday)) return null;
  const minuteOfDay = parts.hour * 60 + parts.minute + parts.second / 60;
  return (
    normalizeSchedule(schedule).find((period) => {
      if (!period.enabled || validatePeriod(period)) return false;
      return minuteOfDay >= timeToMinutes(period.start) && minuteOfDay < timeToMinutes(period.end);
    }) || null
  );
}

export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
