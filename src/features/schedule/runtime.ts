import type { ScheduleEvent, TeamEventType } from "./types";

export type MonthDay = {
  dateKey: string;
  day: number;
  inMonth: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function japanDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function filterScheduleEvents(events: ScheduleEvent[], eventTypes: TeamEventType[]): ScheduleEvent[] {
  const selected = new Set(eventTypes);
  return [...events]
    .filter((event) => selected.size === 0 || selected.has(event.eventType))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function groupEventsByJapanDate(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
  const grouped = new Map<string, ScheduleEvent[]>();
  for (const event of filterScheduleEvents(events, [])) {
    const key = japanDateKey(event.startsAt);
    const current = grouped.get(key) ?? [];
    current.push(event);
    grouped.set(key, current);
  }
  return grouped;
}

export function buildMonthDays(year: number, month: number): MonthDay[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month - 1, 1 - mondayOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    return {
      dateKey: `${y}-${pad(m)}-${pad(day)}`,
      day,
      inMonth: y === year && m === month,
    };
  });
}

export function upcomingScheduleEvents(events: ScheduleEvent[], now: Date, limit = 6): ScheduleEvent[] {
  const nowMs = now.getTime();
  return filterScheduleEvents(events, [])
    .filter((event) => event.status !== "cancelled" && Date.parse(event.startsAt) >= nowMs)
    .slice(0, Math.max(0, limit));
}
