import assert from "node:assert/strict";
import {
  DEFAULT_ACTIVE_DAYS,
  DEFAULT_SCHEDULE,
  buildEventsForDate,
  formatCountdown,
  getCurrentPeriod,
  getPeriodValidationCode,
  getTokyoParts,
  getUpcomingEvent,
  normalizeSchedule,
  validatePeriod,
} from "./scheduler-core.js";

const schedule = normalizeSchedule(DEFAULT_SCHEDULE);

assert.equal(schedule.length, 6);
assert.deepEqual(
  schedule.map(({ label, start, end }) => ({ label, start, end })),
  [
    { label: "1限", start: "08:40", end: "10:10" },
    { label: "2限", start: "10:30", end: "12:00" },
    { label: "3限", start: "13:00", end: "14:30" },
    { label: "4限", start: "14:50", end: "16:20" },
    { label: "5限", start: "16:40", end: "18:10" },
    { label: "6限", start: "18:30", end: "20:00" },
  ],
);

const mondayEvents = buildEventsForDate(schedule, "2026-08-24", DEFAULT_ACTIVE_DAYS);
assert.equal(mondayEvents.length, 12);
assert.deepEqual(
  mondayEvents.map(({ label, kind, time }) => `${label}:${kind}:${time}`),
  [
    "1限:start:08:40", "1限:end:10:10",
    "2限:start:10:30", "2限:end:12:00",
    "3限:start:13:00", "3限:end:14:30",
    "4限:start:14:50", "4限:end:16:20",
    "5限:start:16:40", "5限:end:18:10",
    "6限:start:18:30", "6限:end:20:00",
  ],
);
assert.equal(buildEventsForDate(schedule, "2026-08-23", DEFAULT_ACTIVE_DAYS).length, 0);

const duringFirstPeriod = Date.parse("2026-08-24T09:15:00+09:00");
assert.equal(getCurrentPeriod(schedule, duringFirstPeriod, DEFAULT_ACTIVE_DAYS)?.label, "1限");
assert.equal(getUpcomingEvent(schedule, duringFirstPeriod, DEFAULT_ACTIVE_DAYS)?.time, "10:10");

const fridayAfterSchool = Date.parse("2026-08-28T21:00:00+09:00");
const nextWeekEvent = getUpcomingEvent(schedule, fridayAfterSchool, DEFAULT_ACTIVE_DAYS);
assert.equal(nextWeekEvent?.dateKey, "2026-08-31");
assert.equal(nextWeekEvent?.time, "08:40");

const tokyoMidnight = getTokyoParts(Date.parse("2026-08-23T15:00:01Z"));
assert.equal(tokyoMidnight.dateKey, "2026-08-24");
assert.equal(tokyoMidnight.clock, "00:00:01");

assert.equal(validatePeriod({ label: "7限", start: "21:00", end: "20:00", enabled: true }), "開始は終了より前にしてください");
assert.equal(getPeriodValidationCode({ label: "Period 7", start: "21:00", end: "20:00", enabled: true }), "startBeforeEnd");
assert.equal(validatePeriod({ label: "7限", start: "20:20", end: "21:50", enabled: true }), "");
assert.equal(formatCountdown(3_661_000), "01:01:01");

console.log("PASS: school bell scheduler core");
