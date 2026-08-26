import { describe, expect, it } from "vitest";
import { parseConsoleAction } from "./validation";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const ACTION_ID = "22222222-2222-4222-8222-222222222222";
const SCORER_ID = "33333333-3333-4333-8333-333333333333";
const ROSTER_ID = "44444444-4444-4444-8444-444444444444";
const EVENT_ID = "55555555-5555-4555-8555-555555555555";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const base = {
  matchId: MATCH_ID,
  clientActionId: ACTION_ID,
  expectedVersion: "4",
};

describe("parseConsoleAction", () => {
  it("parses a simple clock action", () => {
    const result = parseConsoleAction(form({ ...base, action: "start_clock" }));
    expect(result).toEqual({
      ok: true,
      value: { matchId: MATCH_ID, clientActionId: ACTION_ID, expectedVersion: 4, action: "start_clock", payload: {} },
    });
  });

  it("rejects malformed ids, versions and unsupported actions", () => {
    expect(parseConsoleAction(form({ ...base, matchId: "bad", action: "stop_clock" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, clientActionId: "bad", action: "stop_clock" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, expectedVersion: "-1", action: "reset_clock" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, expectedVersion: "1.5", action: "reset_clock" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, action: "delete_match" })).ok).toBe(false);
  });

  it("parses a goal with optional managed scorer and goal method", () => {
    const result = parseConsoleAction(form({
      ...base,
      action: "goal",
      side: "home",
      subjectMatchRosterId: ROSTER_ID,
      goalMethod: "seven_meter",
    }));
    expect(result.ok && result.value.payload).toEqual({
      side: "home",
      subject_match_roster_id: ROSTER_ID,
      goal_method: "seven_meter",
    });
  });

  it("keeps backward-compatible scorerTeamMemberId for goals", () => {
    const result = parseConsoleAction(form({ ...base, action: "goal", side: "away", scorerTeamMemberId: SCORER_ID }));
    expect(result.ok && result.value.payload).toEqual({ side: "away", scorer_team_member_id: SCORER_ID });
  });

  it("rejects invalid side, scorer and goal method", () => {
    expect(parseConsoleAction(form({ ...base, action: "goal", side: "ours" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, action: "goal", side: "away", scorerTeamMemberId: "bad" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, action: "goal", side: "home", goalMethod: "own_goal" })).ok).toBe(false);
  });

  it("parses a seven-meter miss with opponent shirt number", () => {
    const result = parseConsoleAction(form({ ...base, action: "seven_meter_missed", side: "away", shirtNumber: "12", displayName: "#12" }));
    expect(result.ok && result.value.payload).toEqual({ side: "away", shirt_number: 12, display_name: "#12" });
  });

  it("requires a participant for warning, suspension and disqualification", () => {
    for (const action of ["warning", "suspension", "disqualification"]) {
      expect(parseConsoleAction(form({ ...base, action, side: "home" })).ok).toBe(false);
      expect(parseConsoleAction(form({ ...base, action, side: "home", subjectMatchRosterId: ROSTER_ID })).ok).toBe(true);
    }
  });

  it("parses a report-required disqualification", () => {
    const result = parseConsoleAction(form({
      ...base,
      action: "disqualification",
      side: "home",
      subjectMatchRosterId: ROSTER_ID,
      reportRequired: "on",
    }));
    expect(result.ok && result.value.payload).toEqual({
      side: "home",
      subject_match_roster_id: ROSTER_ID,
      report_required: true,
    });
  });

  it("parses team timeout using only the side", () => {
    const result = parseConsoleAction(form({ ...base, action: "team_timeout", side: "away" }));
    expect(result.ok && result.value.payload).toEqual({ side: "away" });
  });

  it("validates manual participant fields", () => {
    expect(parseConsoleAction(form({ ...base, action: "warning", side: "away", shirtNumber: "100" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, action: "warning", side: "away", shirtNumber: "9", subjectKind: "coach" })).ok).toBe(false);
    const result = parseConsoleAction(form({ ...base, action: "warning", side: "away", shirtNumber: "9", subjectKind: "player" }));
    expect(result.ok && result.value.payload).toEqual({ side: "away", shirt_number: 9, subject_kind: "player" });
  });

  it("parses an append-only event correction", () => {
    const result = parseConsoleAction(form({ ...base, action: "revert_event", targetEventId: EVENT_ID, reason: "入力訂正" }));
    expect(result.ok && result.value.payload).toEqual({ target_event_id: EVENT_ID, reason: "入力訂正" });
    expect(parseConsoleAction(form({ ...base, action: "revert_event", targetEventId: "bad" })).ok).toBe(false);
  });

  it("parses post-goal scorer attribution without changing score", () => {
    const result = parseConsoleAction(form({
      ...base,
      action: "attribute_goal",
      targetEventId: EVENT_ID,
      subjectMatchRosterId: ROSTER_ID,
    }));
    expect(result.ok && result.value.payload).toEqual({
      target_event_id: EVENT_ID,
      subject_match_roster_id: ROSTER_ID,
    });
    expect(parseConsoleAction(form({ ...base, action: "attribute_goal", targetEventId: "bad", subjectMatchRosterId: ROSTER_ID })).ok).toBe(false);
  });

  it("requires a positive integer period for set_period", () => {
    const valid = parseConsoleAction(form({ ...base, action: "set_period", period: "3" }));
    expect(valid.ok && valid.value.payload).toEqual({ period: 3 });
    expect(parseConsoleAction(form({ ...base, action: "set_period", period: "0" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, action: "set_period", period: "2.5" })).ok).toBe(false);
  });
});
