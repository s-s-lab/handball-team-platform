import { describe, expect, it } from "vitest";
import { parseScheduleForm } from "./validation";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const values = {
    teamId: TEAM_ID,
    eventType: "practice",
    title: "通常練習",
    startsAt: "2026-08-27T18:00",
    endsAt: "2026-08-27T20:00",
    venue: "青山記念館",
    memo: "ボールを持参",
    status: "scheduled",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("schedule validation", () => {
  it("accepts every supported schedule category", () => {
    for (const eventType of ["practice", "official_match", "friendly", "meeting", "other"]) {
      const parsed = parseScheduleForm(form({ eventType }));
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.value.eventType).toBe(eventType);
        expect(parsed.value.startsAt).toBe("2026-08-27T09:00:00.000Z");
      }
    }
  });

  it("requires a title and rejects an end before the start", () => {
    expect(parseScheduleForm(form({ title: "" }))).toMatchObject({ ok: false });
    expect(parseScheduleForm(form({ endsAt: "2026-08-27T17:30" }))).toMatchObject({ ok: false });
  });

  it("allows no end time and trims optional fields", () => {
    const parsed = parseScheduleForm(form({ endsAt: "", venue: "", memo: "" }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.endsAt).toBeNull();
      expect(parsed.value.venue).toBeNull();
      expect(parsed.value.memo).toBeNull();
    }
  });
});
