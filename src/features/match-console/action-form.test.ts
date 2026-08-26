import { describe, expect, it } from "vitest";
import { buildConsoleActionFormData } from "./action-form";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const ACTION_ID = "22222222-2222-4222-8222-222222222222";
const ROSTER_ID = "33333333-3333-4333-8333-333333333333";
const EVENT_ID = "44444444-4444-4444-8444-444444444444";

describe("buildConsoleActionFormData", () => {
  it("maps record-dock payload keys to validation form fields", () => {
    const formData = buildConsoleActionFormData({
      matchId: MATCH_ID,
      clientActionId: ACTION_ID,
      expectedVersion: 12,
      action: "disqualification",
      payload: {
        side: "home",
        subject_match_roster_id: ROSTER_ID,
        report_required: true,
      },
    });

    expect(formData.get("matchId")).toBe(MATCH_ID);
    expect(formData.get("clientActionId")).toBe(ACTION_ID);
    expect(formData.get("expectedVersion")).toBe("12");
    expect(formData.get("action")).toBe("disqualification");
    expect(formData.get("side")).toBe("home");
    expect(formData.get("subjectMatchRosterId")).toBe(ROSTER_ID);
    expect(formData.get("reportRequired")).toBe("on");
  });

  it("maps goal attribution and manual participant fields", () => {
    const formData = buildConsoleActionFormData({
      matchId: MATCH_ID,
      clientActionId: ACTION_ID,
      expectedVersion: 13,
      action: "attribute_goal",
      payload: {
        target_event_id: EVENT_ID,
        shirt_number: 9,
        display_name: "相手9",
        subject_kind: "player",
      },
    });

    expect(formData.get("targetEventId")).toBe(EVENT_ID);
    expect(formData.get("shirtNumber")).toBe("9");
    expect(formData.get("displayName")).toBe("相手9");
    expect(formData.get("subjectKind")).toBe("player");
  });

  it("maps period and goal method fields without special cases in the caller", () => {
    const formData = buildConsoleActionFormData({
      matchId: MATCH_ID,
      clientActionId: ACTION_ID,
      expectedVersion: 14,
      action: "goal",
      payload: {
        side: "away",
        goal_method: "seven_meter",
        period: 2,
      },
    });

    expect(formData.get("side")).toBe("away");
    expect(formData.get("goalMethod")).toBe("seven_meter");
    expect(formData.get("period")).toBe("2");
  });
});
