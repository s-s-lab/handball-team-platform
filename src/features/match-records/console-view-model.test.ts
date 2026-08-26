import { describe, expect, it } from "vitest";
import {
  effectiveCompetitionElapsedMs,
  latestUnattributedGoal,
  recentActionableEvents,
} from "./console-view-model";
import type { RecordEvent } from "./types";

function record(overrides: Partial<RecordEvent>): RecordEvent {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    matchId: "22222222-2222-4222-8222-222222222222",
    stateVersion: 1,
    eventType: "goal",
    relatedEventId: null,
    period: 1,
    periodElapsedMs: 60_000,
    competitionElapsedMs: 60_000,
    subjectSide: "home",
    subjectTeamMemberId: null,
    subjectMatchRosterId: null,
    payload: { side: "home" },
    createdAt: "2026-08-26T08:00:00.000Z",
    ...overrides,
  };
}

describe("match record console view model", () => {
  it("advances competition time only by the running period delta", () => {
    expect(effectiveCompetitionElapsedMs({
      competitionElapsedMs: 1_800_000,
      clockElapsedMs: 300_000,
      displayElapsedMs: 342_500,
      clockRunning: true,
    })).toBe(1_842_500);

    expect(effectiveCompetitionElapsedMs({
      competitionElapsedMs: 1_800_000,
      clockElapsedMs: 300_000,
      displayElapsedMs: 342_500,
      clockRunning: false,
    })).toBe(1_800_000);
  });

  it("finds the latest active goal that still needs scorer attribution", () => {
    const olderGoal = record({ id: "00000000-0000-4000-8000-000000000001", stateVersion: 1 });
    const attributedGoal = record({ id: "00000000-0000-4000-8000-000000000002", stateVersion: 2 });
    const attribution = record({
      id: "00000000-0000-4000-8000-000000000003",
      stateVersion: 3,
      eventType: "goal_attributed",
      relatedEventId: attributedGoal.id,
      subjectMatchRosterId: "00000000-0000-4000-8000-000000000099",
    });
    const revertedGoal = record({ id: "00000000-0000-4000-8000-000000000004", stateVersion: 4 });
    const revert = record({
      id: "00000000-0000-4000-8000-000000000005",
      stateVersion: 5,
      eventType: "event_reverted",
      relatedEventId: revertedGoal.id,
    });

    expect(latestUnattributedGoal([olderGoal, attributedGoal, attribution, revertedGoal, revert])?.id).toBe(olderGoal.id);
  });

  it("does not offer scorer attribution for a goal already recorded with a scorer", () => {
    const scoredGoal = record({
      subjectMatchRosterId: "00000000-0000-4000-8000-000000000099",
      payload: { side: "home", display_name: "鈴木" },
    });
    expect(latestUnattributedGoal([scoredGoal])).toBeNull();
  });

  it("shows only actionable handball record events in recent-record order", () => {
    const events = [
      record({ id: "00000000-0000-4000-8000-000000000001", stateVersion: 1, eventType: "clock_started" }),
      record({ id: "00000000-0000-4000-8000-000000000002", stateVersion: 2, eventType: "goal" }),
      record({ id: "00000000-0000-4000-8000-000000000003", stateVersion: 3, eventType: "warning" }),
      record({ id: "00000000-0000-4000-8000-000000000004", stateVersion: 4, eventType: "team_timeout" }),
      record({ id: "00000000-0000-4000-8000-000000000005", stateVersion: 5, eventType: "clock_stopped" }),
    ];
    expect(recentActionableEvents(events, 2).map((event) => event.eventType)).toEqual([
      "team_timeout",
      "warning",
    ]);
  });
});
