import { describe, expect, it } from "vitest";
import { mapRecordEventRows } from "./data-shaping";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const MEMBER_ID = "33333333-3333-4333-8333-333333333333";
const ROSTER_ID = "44444444-4444-4444-8444-444444444444";

describe("mapRecordEventRows", () => {
  it("maps safe snake_case RPC rows to typed record events", () => {
    expect(mapRecordEventRows([{
      id: EVENT_ID,
      match_id: MATCH_ID,
      state_version: 7,
      event_type: "suspension",
      related_event_id: null,
      period: 2,
      period_elapsed_ms: 480000,
      competition_elapsed_ms: 2280000,
      subject_side: "home",
      subject_team_member_id: MEMBER_ID,
      subject_match_roster_id: ROSTER_ID,
      payload: {
        shirt_number: 12,
        display_name: "佐藤",
        suspension_count: 2,
        expires_at_competition_elapsed_ms: 2400000,
      },
      created_at: "2026-08-26T08:00:00.000Z",
    }])).toEqual([{
      id: EVENT_ID,
      matchId: MATCH_ID,
      stateVersion: 7,
      eventType: "suspension",
      relatedEventId: null,
      period: 2,
      periodElapsedMs: 480000,
      competitionElapsedMs: 2280000,
      subjectSide: "home",
      subjectTeamMemberId: MEMBER_ID,
      subjectMatchRosterId: ROSTER_ID,
      payload: {
        shirt_number: 12,
        display_name: "佐藤",
        suspension_count: 2,
        expires_at_competition_elapsed_ms: 2400000,
      },
      createdAt: "2026-08-26T08:00:00.000Z",
    }]);
  });

  it("drops malformed rows instead of inventing record history", () => {
    expect(mapRecordEventRows([{ id: "bad", event_type: "suspension" }, null, "bad"])).toEqual([]);
  });
});
