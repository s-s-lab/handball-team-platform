import { describe, expect, it } from "vitest";
import { parseConsoleAction } from "./validation";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const ACTION_ID = "22222222-2222-4222-8222-222222222222";
const SCORER_ID = "33333333-3333-4333-8333-333333333333";

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
      value: {
        matchId: MATCH_ID,
        clientActionId: ACTION_ID,
        expectedVersion: 4,
        action: "start_clock",
        payload: {},
      },
    });
  });

  it("rejects malformed match and client action ids", () => {
    expect(parseConsoleAction(form({ ...base, matchId: "bad", action: "stop_clock" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, clientActionId: "bad", action: "stop_clock" })).ok).toBe(false);
  });

  it("rejects negative and fractional versions", () => {
    expect(parseConsoleAction(form({ ...base, expectedVersion: "-1", action: "reset_clock" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, expectedVersion: "1.5", action: "reset_clock" })).ok).toBe(false);
  });

  it("rejects unsupported actions", () => {
    const result = parseConsoleAction(form({ ...base, action: "delete_match" }));
    expect(result.ok).toBe(false);
  });

  it("requires HOME or AWAY for a goal", () => {
    const valid = parseConsoleAction(form({ ...base, action: "goal", side: "home" }));
    expect(valid.ok && valid.value.payload).toEqual({ side: "home" });

    const invalid = parseConsoleAction(form({ ...base, action: "goal", side: "ours" }));
    expect(invalid.ok).toBe(false);
  });

  it("accepts an optional scorer UUID for a goal", () => {
    const result = parseConsoleAction(
      form({ ...base, action: "goal", side: "away", scorerTeamMemberId: SCORER_ID }),
    );
    expect(result.ok && result.value.payload).toEqual({
      side: "away",
      scorer_team_member_id: SCORER_ID,
    });
  });

  it("rejects a malformed optional scorer", () => {
    const result = parseConsoleAction(
      form({ ...base, action: "goal", side: "away", scorerTeamMemberId: "bad" }),
    );
    expect(result.ok).toBe(false);
  });

  it("requires a positive integer period for set_period", () => {
    const valid = parseConsoleAction(form({ ...base, action: "set_period", period: "3" }));
    expect(valid.ok && valid.value.payload).toEqual({ period: 3 });

    expect(parseConsoleAction(form({ ...base, action: "set_period", period: "0" })).ok).toBe(false);
    expect(parseConsoleAction(form({ ...base, action: "set_period", period: "2.5" })).ok).toBe(false);
  });
});
