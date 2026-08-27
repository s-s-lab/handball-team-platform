import { describe, expect, it } from "vitest";
import { parseMatchSeasonForm, parseSeasonForm, parseSeasonStatsForm } from "./validation";

const teamId = "11111111-1111-4111-8111-111111111111";
const seasonId = "22222222-2222-4222-8222-222222222222";
const matchId = "33333333-3333-4333-8333-333333333333";
const memberId = "44444444-4444-4444-8444-444444444444";

describe("season stats form validation", () => {
  it("parses a valid season and rejects reversed dates", () => {
    const valid = new FormData();
    valid.set("teamId", teamId);
    valid.set("name", "2026-27");
    valid.set("startDate", "2026-08-01");
    valid.set("endDate", "2027-07-31");
    valid.set("isCurrent", "true");
    expect(parseSeasonForm(valid)).toEqual({ ok: true, value: { teamId, seasonId: null, name: "2026-27", startDate: "2026-08-01", endDate: "2027-07-31", isCurrent: true } });

    valid.set("endDate", "2026-07-31");
    expect(parseSeasonForm(valid).ok).toBe(false);
  });

  it("parses match season assignment including clearing the season", () => {
    const form = new FormData();
    form.set("teamId", teamId);
    form.set("matchId", matchId);
    form.set(`seasonId:${matchId}`, "");
    expect(parseMatchSeasonForm(form)).toEqual({ ok: true, value: { teamId, matchId, seasonId: null } });
  });

  it("parses bulk player stats and rejects inconsistent totals", () => {
    const form = new FormData();
    form.set("teamId", teamId);
    form.set("seasonId", seasonId);
    form.append("memberId", memberId);
    form.set(`appearances:${memberId}`, "8");
    form.set(`starts:${memberId}`, "7");
    form.set(`goals:${memberId}`, "42");
    form.set(`sevenMeterGoals:${memberId}`, "5");
    form.set(`sevenMeterAttempts:${memberId}`, "6");
    form.set(`warnings:${memberId}`, "1");
    form.set(`twoMinuteSuspensions:${memberId}`, "2");
    form.set(`disqualifications:${memberId}`, "0");
    form.set(`saves:${memberId}`, "0");
    form.set(`shotsFaced:${memberId}`, "0");
    form.set(`notes:${memberId}`, "主将");

    const parsed = parseSeasonStatsForm(form);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.rows[0]).toMatchObject({ teamMemberId: memberId, appearances: 8, starts: 7, goals: 42, sevenMeterGoals: 5, sevenMeterAttempts: 6, notes: "主将" });

    form.set(`starts:${memberId}`, "9");
    expect(parseSeasonStatsForm(form).ok).toBe(false);
    form.set(`starts:${memberId}`, "7");
    form.set(`saves:${memberId}`, "12");
    form.set(`shotsFaced:${memberId}`, "10");
    expect(parseSeasonStatsForm(form).ok).toBe(false);
  });
});
