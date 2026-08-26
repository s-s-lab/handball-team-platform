import { describe, expect, it } from "vitest";
import {
  deriveActiveSuspensions,
  deriveMatchRecordSummary,
  isEventReverted,
  remainingSuspensionMs,
} from "./runtime";
import type { RecordEvent } from "./types";

const baseEvent: RecordEvent = {
  id: "00000000-0000-4000-8000-000000000001",
  matchId: "00000000-0000-4000-8000-000000000010",
  stateVersion: 1,
  eventType: "suspension",
  relatedEventId: null,
  period: 1,
  periodElapsedMs: 29 * 60_000 + 30_000,
  competitionElapsedMs: 29 * 60_000 + 30_000,
  subjectSide: "home",
  subjectTeamMemberId: "00000000-0000-4000-8000-000000000020",
  subjectMatchRosterId: "00000000-0000-4000-8000-000000000030",
  payload: {
    shirt_number: 12,
    display_name: "佐藤",
    suspension_count: 1,
    starts_at_competition_elapsed_ms: 29 * 60_000 + 30_000,
    expires_at_competition_elapsed_ms: 31 * 60_000 + 30_000,
  },
  createdAt: "2026-08-26T07:00:00.000Z",
};

function event(overrides: Partial<RecordEvent>): RecordEvent {
  return { ...baseEvent, ...overrides };
}

describe("match record runtime", () => {
  it("counts suspension remaining time only from competition playing time", () => {
    expect(remainingSuspensionMs(baseEvent, 30 * 60_000)).toBe(90_000);
    expect(remainingSuspensionMs(baseEvent, 31 * 60_000 + 30_000)).toBe(0);
  });

  it("keeps suspension active across halftime because breaks do not advance competition time", () => {
    const active = deriveActiveSuspensions([baseEvent], 30 * 60_000);
    expect(active).toHaveLength(1);
    expect(active[0]?.remainingMs).toBe(90_000);
    expect(active[0]?.shirtNumber).toBe(12);
  });

  it("summarizes third suspension as resulting in disqualification", () => {
    const events = [
      event({ id: "s1", stateVersion: 1, payload: { ...baseEvent.payload, suspension_count: 1 } }),
      event({ id: "s2", stateVersion: 2, payload: { ...baseEvent.payload, suspension_count: 2 } }),
      event({
        id: "s3",
        stateVersion: 3,
        payload: { ...baseEvent.payload, suspension_count: 3, resulting_disqualification: true },
      }),
    ];

    const summary = deriveMatchRecordSummary(events);
    const player = summary.participants.find((item) => item.subjectMatchRosterId === baseEvent.subjectMatchRosterId);
    expect(player?.suspensions).toBe(3);
    expect(player?.disqualifications).toBe(1);
  });

  it("counts seven-meter goal as both a goal and a seven-meter attempt", () => {
    const events = [
      event({
        id: "g1",
        stateVersion: 1,
        eventType: "goal",
        periodElapsedMs: 123_000,
        competitionElapsedMs: 123_000,
        payload: { shirt_number: 7, display_name: "鈴木", goal_method: "seven_meter" },
      }),
      event({
        id: "7m-miss",
        stateVersion: 2,
        eventType: "seven_meter_missed",
        periodElapsedMs: 240_000,
        competitionElapsedMs: 240_000,
        payload: { shirt_number: 7, display_name: "鈴木" },
      }),
    ];

    const summary = deriveMatchRecordSummary(events);
    const player = summary.participants[0];
    expect(player?.goals).toBe(1);
    expect(player?.sevenMeterGoals).toBe(1);
    expect(player?.sevenMeterAttempts).toBe(2);
    expect(player?.goalTimesMs).toEqual([123_000]);
  });

  it("attributes an already-counted goal without changing the score event", () => {
    const goal = event({
      id: "goal-late-scorer",
      stateVersion: 1,
      eventType: "goal",
      subjectTeamMemberId: null,
      subjectMatchRosterId: null,
      periodElapsedMs: 321_000,
      competitionElapsedMs: 321_000,
      payload: { side: "home", goal_method: "open_play" },
    });
    const attribution = event({
      id: "goal-attribution",
      stateVersion: 2,
      eventType: "goal_attributed",
      relatedEventId: goal.id,
      subjectTeamMemberId: "00000000-0000-4000-8000-000000000077",
      subjectMatchRosterId: "00000000-0000-4000-8000-000000000088",
      payload: { shirt_number: 7, display_name: "鈴木" },
    });

    const summary = deriveMatchRecordSummary([goal, attribution]);
    expect(summary.participants).toHaveLength(1);
    expect(summary.participants[0]?.subjectMatchRosterId).toBe(attribution.subjectMatchRosterId);
    expect(summary.participants[0]?.goals).toBe(1);
    expect(summary.participants[0]?.goalTimesMs).toEqual([321_000]);
  });

  it("excludes reverted events from aggregate totals while preserving reversal knowledge", () => {
    const goal = event({
      id: "goal-1",
      stateVersion: 1,
      eventType: "goal",
      payload: { shirt_number: 9, display_name: "高橋", goal_method: "open_play" },
    });
    const revert = event({
      id: "revert-1",
      stateVersion: 2,
      eventType: "event_reverted",
      relatedEventId: "goal-1",
      payload: { reason: "入力訂正" },
    });

    expect(isEventReverted("goal-1", [goal, revert])).toBe(true);
    expect(deriveMatchRecordSummary([goal, revert]).participants).toEqual([]);
  });

  it("tracks warning and team-timeout records", () => {
    const events = [
      event({ id: "w1", stateVersion: 1, eventType: "warning", payload: { shirt_number: 4, display_name: "山田" } }),
      event({
        id: "t1",
        stateVersion: 2,
        eventType: "team_timeout",
        subjectSide: "home",
        subjectTeamMemberId: null,
        subjectMatchRosterId: null,
        periodElapsedMs: 18 * 60_000 + 21_000,
        competitionElapsedMs: 18 * 60_000 + 21_000,
        payload: {},
      }),
    ];

    const summary = deriveMatchRecordSummary(events);
    expect(summary.participants[0]?.warnings).toBe(1);
    expect(summary.teamTimeouts.home).toEqual([{ period: 1, periodElapsedMs: 18 * 60_000 + 21_000 }]);
  });
});
