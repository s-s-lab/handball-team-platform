import { describe, expect, it } from "vitest";
import {
  effectivePublicElapsedMs,
  formatPublicClock,
  publicPeriodDurationMs,
  sortPublicMatchSummaries,
} from "./runtime";

const baseLive = {
  matchId: "11111111-1111-4111-8111-111111111111",
  matchName: "League Match",
  teamId: "22222222-2222-4222-8222-222222222222",
  teamName: "Blue Handball",
  teamShortName: "BLUE",
  opponentName: "Red Handball",
  teamSide: "home" as const,
  scheduledAt: "2026-08-26T10:00:00.000Z",
  venue: "Gym",
  status: "live" as const,
  serverNow: "2026-08-26T10:10:00.000Z",
  rules: {
    periodCount: 2,
    periodSeconds: 1800,
    overtimeEnabled: true,
    overtimePeriodCount: 2,
    overtimePeriodSeconds: 300,
  },
  state: {
    version: 3,
    currentPeriod: 1,
    clockElapsedMs: 60_000,
    clockRunning: false,
    clockStartedAt: null,
    homeScore: 2,
    awayScore: 1,
  },
};

describe("public LIVE runtime", () => {
  it("formats elapsed time as mm:ss", () => {
    expect(formatPublicClock(18 * 60_000 + 42_000)).toBe("18:42");
    expect(formatPublicClock(0)).toBe("00:00");
  });

  it("returns persisted elapsed time when stopped", () => {
    expect(effectivePublicElapsedMs(baseLive, Date.parse(baseLive.serverNow))).toBe(60_000);
  });

  it("advances a running clock and clamps at the period duration", () => {
    const live = {
      ...baseLive,
      state: {
        ...baseLive.state,
        clockElapsedMs: 1_795_000,
        clockRunning: true,
        clockStartedAt: "2026-08-26T10:09:55.000Z",
      },
    };

    expect(effectivePublicElapsedMs(live, Date.parse(baseLive.serverNow))).toBe(1_800_000);
  });

  it("uses overtime duration after regulation periods", () => {
    const overtime = {
      ...baseLive,
      state: { ...baseLive.state, currentPeriod: 3 },
    };

    expect(publicPeriodDurationMs(overtime)).toBe(300_000);
  });
});

describe("sortPublicMatchSummaries", () => {
  it("orders live first, future scheduled next, then finished", () => {
    const now = Date.parse("2026-08-26T09:00:00.000Z");
    const input = [
      {
        matchId: "33333333-3333-4333-8333-333333333333",
        matchName: "Finished",
        opponentName: "A",
        teamSide: "home" as const,
        scheduledAt: "2026-08-25T10:00:00.000Z",
        venue: null,
        status: "finished" as const,
        homeScore: 20,
        awayScore: 18,
      },
      {
        matchId: "44444444-4444-4444-8444-444444444444",
        matchName: "Upcoming",
        opponentName: "B",
        teamSide: "away" as const,
        scheduledAt: "2026-08-27T10:00:00.000Z",
        venue: null,
        status: "scheduled" as const,
        homeScore: 0,
        awayScore: 0,
      },
      {
        matchId: "55555555-5555-4555-8555-555555555555",
        matchName: "Live",
        opponentName: "C",
        teamSide: "home" as const,
        scheduledAt: "2026-08-26T08:00:00.000Z",
        venue: null,
        status: "live" as const,
        homeScore: 7,
        awayScore: 6,
      },
    ];

    expect(sortPublicMatchSummaries(input, now).map((match) => match.status)).toEqual([
      "live",
      "scheduled",
      "finished",
    ]);
  });
});
