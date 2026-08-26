import { describe, expect, it } from "vitest";
import { applyLocalAction } from "./reducer";
import type { OfflineMatchState } from "./types";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const ROSTER_ID = "22222222-2222-4222-8222-222222222222";

function state(overrides: Partial<OfflineMatchState> = {}): OfflineMatchState {
  return {
    snapshot: {
      matchId: MATCH_ID,
      version: 10,
      currentPeriod: 1,
      clockElapsedMs: 300_000,
      competitionElapsedMs: 300_000,
      clockRunning: false,
      clockStartedAt: null,
      homeScore: 3,
      awayScore: 2,
      matchStatus: "live",
      periodDurationMs: 1_800_000,
      serverNow: "2026-08-26T09:00:00.000Z",
    },
    rules: {
      periodCount: 2,
      periodSeconds: 1_800,
      overtimeEnabled: true,
      overtimePeriodCount: 2,
      overtimePeriodSeconds: 300,
      teamTimeoutsPerGame: 3,
      teamTimeoutsPerPeriod: 2,
    },
    managedSide: "home",
    events: [],
    nextLocalSequence: 1,
    ...overrides,
  };
}

function action(actionName: Parameters<typeof applyLocalAction>[1]["action"], payload: Record<string, string | number | boolean> = {}, suffix = 1) {
  return {
    clientActionId: `30000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    action: actionName,
    payload,
  };
}

describe("applyLocalAction", () => {
  it("materializes period and competition clocks when stopping offline", () => {
    const started = applyLocalAction(state(), action("start_clock"), Date.parse("2026-08-26T09:00:00.000Z"));
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const stopped = applyLocalAction(started.state, action("stop_clock", {}, 2), Date.parse("2026-08-26T09:00:30.000Z"));
    expect(stopped.ok).toBe(true);
    if (!stopped.ok) return;

    expect(stopped.state.snapshot.clockRunning).toBe(false);
    expect(stopped.state.snapshot.clockElapsedMs).toBe(330_000);
    expect(stopped.state.snapshot.competitionElapsedMs).toBe(330_000);
    expect(stopped.event?.periodElapsedMs).toBe(330_000);
    expect(stopped.event?.competitionElapsedMs).toBe(330_000);
  });

  it("projects goals and seven-meter misses without waiting for the server", () => {
    const goal = applyLocalAction(
      state(),
      action("goal", { side: "home", goal_method: "seven_meter", shirt_number: 7, display_name: "鈴木" }),
      Date.parse("2026-08-26T09:00:00.000Z"),
    );
    expect(goal.ok).toBe(true);
    if (!goal.ok) return;
    expect(goal.state.snapshot.homeScore).toBe(4);
    expect(goal.event?.eventType).toBe("goal");
    expect(goal.event?.payload.goal_method).toBe("seven_meter");

    const missed = applyLocalAction(
      goal.state,
      action("seven_meter_missed", { side: "away", shirt_number: 9 }, 2),
      Date.parse("2026-08-26T09:00:05.000Z"),
    );
    expect(missed.ok).toBe(true);
    if (!missed.ok) return;
    expect(missed.state.snapshot.homeScore).toBe(4);
    expect(missed.state.snapshot.awayScore).toBe(2);
    expect(missed.event?.eventType).toBe("seven_meter_missed");
  });

  it("stops a running clock and starts a two-minute competition-time suspension", () => {
    const running = state({
      snapshot: {
        ...state().snapshot,
        clockRunning: true,
        clockStartedAt: "2026-08-26T09:00:00.000Z",
      },
    });

    const result = applyLocalAction(
      running,
      action("suspension", {
        side: "home",
        subject_match_roster_id: ROSTER_ID,
        subject_kind: "player",
        shirt_number: 12,
        display_name: "佐藤",
      }),
      Date.parse("2026-08-26T09:00:30.000Z"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.snapshot.clockRunning).toBe(false);
    expect(result.state.snapshot.clockElapsedMs).toBe(330_000);
    expect(result.state.snapshot.competitionElapsedMs).toBe(330_000);
    expect(result.event?.payload.suspension_count).toBe(1);
    expect(result.event?.payload.starts_at_competition_elapsed_ms).toBe(330_000);
    expect(result.event?.payload.expires_at_competition_elapsed_ms).toBe(450_000);
  });

  it("marks a player's third suspension as resulting in disqualification", () => {
    const existing = [1, 2].map((count) => ({
      id: `40000000-0000-4000-8000-${String(count).padStart(12, "0")}`,
      matchId: MATCH_ID,
      stateVersion: 10 + count,
      eventType: "suspension" as const,
      relatedEventId: null,
      period: 1,
      periodElapsedMs: 100_000 * count,
      competitionElapsedMs: 100_000 * count,
      subjectSide: "home" as const,
      subjectTeamMemberId: null,
      subjectMatchRosterId: ROSTER_ID,
      payload: { suspension_count: count, shirt_number: 12, display_name: "佐藤", subject_kind: "player" },
      createdAt: "2026-08-26T09:00:00.000Z",
    }));

    const result = applyLocalAction(
      state({ events: existing }),
      action("suspension", {
        side: "home",
        subject_match_roster_id: ROSTER_ID,
        subject_kind: "player",
        shirt_number: 12,
        display_name: "佐藤",
      }),
      Date.parse("2026-08-26T09:10:00.000Z"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event?.payload.suspension_count).toBe(3);
    expect(result.event?.payload.resulting_disqualification).toBe(true);
  });

  it("enforces local team-timeout period limits and rejects overtime TTO", () => {
    const timeouts = [1, 2].map((index) => ({
      id: `50000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      matchId: MATCH_ID,
      stateVersion: 10 + index,
      eventType: "team_timeout" as const,
      relatedEventId: null,
      period: 1,
      periodElapsedMs: index * 100_000,
      competitionElapsedMs: index * 100_000,
      subjectSide: "home" as const,
      subjectTeamMemberId: null,
      subjectMatchRosterId: null,
      payload: {},
      createdAt: "2026-08-26T09:00:00.000Z",
    }));

    const limited = applyLocalAction(
      state({ events: timeouts }),
      action("team_timeout", { side: "home" }),
      Date.parse("2026-08-26T09:10:00.000Z"),
    );
    expect(limited).toMatchObject({ ok: false });

    const overtime = applyLocalAction(
      state({ snapshot: { ...state().snapshot, currentPeriod: 3 } }),
      action("team_timeout", { side: "home" }, 2),
      Date.parse("2026-08-26T09:10:00.000Z"),
    );
    expect(overtime).toMatchObject({ ok: false });
  });

  it("reverts an optimistic goal append-only and restores the projected score", () => {
    const goalEvent = {
      id: "60000000-0000-4000-8000-000000000001",
      matchId: MATCH_ID,
      stateVersion: 11,
      eventType: "goal" as const,
      relatedEventId: null,
      period: 1,
      periodElapsedMs: 200_000,
      competitionElapsedMs: 200_000,
      subjectSide: "home" as const,
      subjectTeamMemberId: null,
      subjectMatchRosterId: null,
      payload: { side: "home" },
      createdAt: "2026-08-26T09:00:00.000Z",
    };

    const result = applyLocalAction(
      state({ events: [goalEvent], snapshot: { ...state().snapshot, homeScore: 4 } }),
      action("revert_event", { target_event_id: goalEvent.id, reason: "入力訂正" }),
      Date.parse("2026-08-26T09:10:00.000Z"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.snapshot.homeScore).toBe(3);
    expect(result.event).toMatchObject({ eventType: "event_reverted", relatedEventId: goalEvent.id });
    expect(result.event?.payload.reason).toBe("入力訂正");
  });
});
