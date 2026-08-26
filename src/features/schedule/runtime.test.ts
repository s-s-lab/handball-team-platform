import { describe, expect, it } from "vitest";
import { buildMonthDays, filterScheduleEvents, groupEventsByJapanDate } from "./runtime";
import type { ScheduleEvent } from "./types";

const events: ScheduleEvent[] = [
  {
    id: "a",
    teamId: "team",
    linkedMatchId: null,
    eventType: "practice",
    title: "夜練習",
    startsAt: "2026-08-26T10:00:00.000Z",
    endsAt: "2026-08-26T12:00:00.000Z",
    venue: "Gym",
    memo: null,
    status: "scheduled",
  },
  {
    id: "b",
    teamId: "team",
    linkedMatchId: "match-1",
    eventType: "official_match",
    title: "関東リーグ vs 東京HC",
    startsAt: "2026-08-29T00:00:00.000Z",
    endsAt: null,
    venue: "Arena",
    memo: null,
    status: "scheduled",
  },
  {
    id: "c",
    teamId: "team",
    linkedMatchId: null,
    eventType: "meeting",
    title: "振り返り",
    startsAt: "2026-09-01T03:00:00.000Z",
    endsAt: null,
    venue: null,
    memo: null,
    status: "scheduled",
  },
];

describe("schedule runtime", () => {
  it("groups events by calendar day in Japan", () => {
    const grouped = groupEventsByJapanDate(events);
    expect(grouped.get("2026-08-26")?.map((event) => event.id)).toEqual(["a"]);
    expect(grouped.get("2026-08-29")?.map((event) => event.id)).toEqual(["b"]);
    expect(grouped.get("2026-09-01")?.map((event) => event.id)).toEqual(["c"]);
  });

  it("filters by category and preserves chronological order", () => {
    expect(filterScheduleEvents(events, ["official_match", "practice"]).map((event) => event.id)).toEqual(["a", "b"]);
    expect(filterScheduleEvents(events, []).map((event) => event.id)).toEqual(["a", "b", "c"]);
  });

  it("builds a full Monday-start month grid", () => {
    const days = buildMonthDays(2026, 8);
    expect(days).toHaveLength(42);
    expect(days[0]?.dateKey).toBe("2026-07-27");
    expect(days[41]?.dateKey).toBe("2026-09-06");
    expect(days.find((day) => day.dateKey === "2026-08-01")?.inMonth).toBe(true);
  });
});
