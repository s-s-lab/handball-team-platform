import { describe, expect, it } from "vitest";
import {
  japanLocalDateTimeToIso,
  parseMatchForm,
  parseRosterForm,
} from "./validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function validMatch(overrides: Record<string, string> = {}) {
  return form({
    teamId: "11111111-1111-4111-8111-111111111111",
    name: "秋季リーグ 第1戦",
    opponentName: "Tokyo HC",
    teamSide: "home",
    scheduledAt: "2026-08-30T13:30",
    venue: "青山体育館",
    memo: "集合12:00",
    isPublic: "on",
    periodCount: "2",
    periodMinutes: "30",
    halftimeMinutes: "10",
    overtimePeriodCount: "2",
    overtimePeriodMinutes: "5",
    teamTimeoutsPerGame: "2",
    teamTimeoutsPerPeriod: "1",
    teamTimeoutSeconds: "60",
    ...overrides,
  });
}

describe("japanLocalDateTimeToIso", () => {
  it("converts a Japan local datetime to UTC ISO", () => {
    expect(japanLocalDateTimeToIso("2026-08-30T13:30")).toBe("2026-08-30T04:30:00.000Z");
  });

  it("rejects impossible calendar values", () => {
    expect(japanLocalDateTimeToIso("2026-02-30T13:30")).toBeNull();
    expect(japanLocalDateTimeToIso("bad-value")).toBeNull();
  });
});

describe("parseMatchForm", () => {
  it("parses a standard HOME match and converts minute rules to seconds", () => {
    const result = parseMatchForm(validMatch());

    expect(result).toEqual({
      ok: true,
      value: {
        teamId: "11111111-1111-4111-8111-111111111111",
        name: "秋季リーグ 第1戦",
        opponentName: "Tokyo HC",
        teamSide: "home",
        scheduledAt: "2026-08-30T04:30:00.000Z",
        venue: "青山体育館",
        memo: "集合12:00",
        isPublic: true,
        rules: {
          periodCount: 2,
          periodSeconds: 1800,
          halftimeSeconds: 600,
          overtimeEnabled: false,
          overtimePeriodCount: 2,
          overtimePeriodSeconds: 300,
          teamTimeoutsPerGame: 2,
          teamTimeoutsPerPeriod: 1,
          teamTimeoutSeconds: 60,
        },
      },
    });
  });

  it("accepts AWAY and enabled overtime", () => {
    const data = validMatch({ teamSide: "away", overtimeEnabled: "on" });
    const result = parseMatchForm(data);
    expect(result.ok && result.value.teamSide).toBe("away");
    expect(result.ok && result.value.rules.overtimeEnabled).toBe(true);
  });

  it("rejects malformed team ids", () => {
    expect(parseMatchForm(validMatch({ teamId: "bad" })).ok).toBe(false);
  });

  it("rejects missing match and opponent names", () => {
    expect(parseMatchForm(validMatch({ name: "" })).ok).toBe(false);
    expect(parseMatchForm(validMatch({ opponentName: "" })).ok).toBe(false);
  });

  it("rejects impossible scheduled dates", () => {
    expect(parseMatchForm(validMatch({ scheduledAt: "2026-02-30T12:00" })).ok).toBe(false);
  });

  it.each([
    ["periodCount", "0"],
    ["periodCount", "5"],
    ["periodMinutes", "30.5"],
    ["periodMinutes", "0"],
    ["halftimeMinutes", "31"],
    ["overtimePeriodCount", "0"],
    ["overtimePeriodMinutes", "31"],
    ["teamTimeoutsPerGame", "4"],
    ["teamTimeoutsPerPeriod", "3"],
    ["teamTimeoutSeconds", "29"],
    ["teamTimeoutSeconds", "121"],
  ])("rejects invalid rule %s=%s", (key, value) => {
    expect(parseMatchForm(validMatch({ [key]: value })).ok).toBe(false);
  });
});

describe("parseRosterForm", () => {
  it("deduplicates selected team member ids", () => {
    const data = new FormData();
    data.set("matchId", "22222222-2222-4222-8222-222222222222");
    data.append("teamMemberId", "33333333-3333-4333-8333-333333333333");
    data.append("teamMemberId", "44444444-4444-4444-8444-444444444444");
    data.append("teamMemberId", "33333333-3333-4333-8333-333333333333");

    expect(parseRosterForm(data)).toEqual({
      ok: true,
      value: {
        matchId: "22222222-2222-4222-8222-222222222222",
        teamMemberIds: [
          "33333333-3333-4333-8333-333333333333",
          "44444444-4444-4444-8444-444444444444",
        ],
      },
    });
  });

  it("allows an empty roster", () => {
    const data = form({ matchId: "22222222-2222-4222-8222-222222222222" });
    expect(parseRosterForm(data)).toEqual({
      ok: true,
      value: { matchId: "22222222-2222-4222-8222-222222222222", teamMemberIds: [] },
    });
  });

  it("rejects malformed match or team member ids", () => {
    expect(parseRosterForm(form({ matchId: "bad" })).ok).toBe(false);

    const data = form({ matchId: "22222222-2222-4222-8222-222222222222" });
    data.append("teamMemberId", "bad");
    expect(parseRosterForm(data).ok).toBe(false);
  });
});
