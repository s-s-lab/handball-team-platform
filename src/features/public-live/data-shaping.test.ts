import { describe, expect, it } from "vitest";
import { shapePublicLiveMatch, shapePublicMatchSummaries } from "./data-shaping";

const validPayload = {
  match_id: "11111111-1111-4111-8111-111111111111",
  match_name: "League Match",
  team_id: "22222222-2222-4222-8222-222222222222",
  team_name: "Blue Handball",
  team_short_name: "BLUE",
  opponent_name: "Red Handball",
  team_side: "home",
  scheduled_at: "2026-08-26T10:00:00+00:00",
  venue: "Gym",
  status: "live",
  server_now: "2026-08-26T10:10:00+00:00",
  rules: {
    period_count: 2,
    period_seconds: 1800,
    overtime_enabled: true,
    overtime_period_count: 2,
    overtime_period_seconds: 300,
  },
  state: {
    version: 4,
    current_period: 1,
    clock_elapsed_ms: 420000,
    clock_running: true,
    clock_started_at: "2026-08-26T10:09:00+00:00",
    home_score: 7,
    away_score: 6,
  },
};

describe("shapePublicLiveMatch", () => {
  it("maps a valid sanitized RPC payload", () => {
    expect(shapePublicLiveMatch(validPayload)).toEqual({
      matchId: validPayload.match_id,
      matchName: "League Match",
      teamId: validPayload.team_id,
      teamName: "Blue Handball",
      teamShortName: "BLUE",
      opponentName: "Red Handball",
      teamSide: "home",
      scheduledAt: validPayload.scheduled_at,
      venue: "Gym",
      status: "live",
      serverNow: validPayload.server_now,
      rules: {
        periodCount: 2,
        periodSeconds: 1800,
        overtimeEnabled: true,
        overtimePeriodCount: 2,
        overtimePeriodSeconds: 300,
      },
      state: {
        version: 4,
        currentPeriod: 1,
        clockElapsedMs: 420000,
        clockRunning: true,
        clockStartedAt: validPayload.state.clock_started_at,
        homeScore: 7,
        awayScore: 6,
      },
    });
  });

  it("rejects a payload with missing state", () => {
    const { state: _state, ...missingState } = validPayload;
    expect(shapePublicLiveMatch(missingState)).toBeNull();
  });

  it("rejects malformed numeric fields", () => {
    expect(
      shapePublicLiveMatch({
        ...validPayload,
        state: { ...validPayload.state, home_score: "seven" },
      }),
    ).toBeNull();
  });

  it("rejects unsupported status and side values", () => {
    expect(shapePublicLiveMatch({ ...validPayload, status: "draft" })).toBeNull();
    expect(shapePublicLiveMatch({ ...validPayload, team_side: "neutral" })).toBeNull();
  });
});

describe("shapePublicMatchSummaries", () => {
  it("maps valid rows and filters malformed rows", () => {
    const rows = [
      {
        match_id: "33333333-3333-4333-8333-333333333333",
        match_name: "Final",
        opponent_name: "Opponent",
        team_side: "away",
        scheduled_at: "2026-08-25T10:00:00+00:00",
        venue: null,
        status: "finished",
        home_score: 18,
        away_score: 20,
      },
      {
        match_id: "bad",
        match_name: "Broken",
        opponent_name: "Opponent",
        team_side: "home",
        scheduled_at: "not-a-date",
        venue: null,
        status: "live",
        home_score: 0,
        away_score: 0,
      },
    ];

    expect(shapePublicMatchSummaries(rows)).toEqual([
      {
        matchId: rows[0].match_id,
        matchName: "Final",
        opponentName: "Opponent",
        teamSide: "away",
        scheduledAt: rows[0].scheduled_at,
        venue: null,
        status: "finished",
        homeScore: 18,
        awayScore: 20,
      },
    ]);
  });
});
