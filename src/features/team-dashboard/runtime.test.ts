import { describe, expect, it } from "vitest";

describe("team dashboard summary", () => {
  it("classifies results from the selected team's side", async () => {
    const dashboard = await import("./runtime").catch(() => null);

    expect(dashboard?.classifyTeamResult).toBeTypeOf("function");
    if (!dashboard?.classifyTeamResult) return;

    expect(dashboard.classifyTeamResult({ teamSide: "home", homeScore: 31, awayScore: 28 })).toBe("win");
    expect(dashboard.classifyTeamResult({ teamSide: "away", homeScore: 31, awayScore: 28 })).toBe("loss");
    expect(dashboard.classifyTeamResult({ teamSide: "away", homeScore: 25, awayScore: 25 })).toBe("draw");
  });

  it("builds the dashboard overview from match and roster data", async () => {
    const dashboard = await import("./runtime").catch(() => null);

    expect(dashboard?.buildDashboardSummary).toBeTypeOf("function");
    if (!dashboard?.buildDashboardSummary) return;

    const matches = [
      { id: "future-2", name: "League 2", opponentName: "Tokyo HC", teamSide: "away" as const, scheduledAt: "2026-09-03T10:00:00.000Z", venue: "Arena B", status: "scheduled" as const, homeScore: 0, awayScore: 0 },
      { id: "future-1", name: "League 1", opponentName: "Yokohama HC", teamSide: "home" as const, scheduledAt: "2026-08-29T09:00:00.000Z", venue: "Arena A", status: "scheduled" as const, homeScore: 0, awayScore: 0 },
      { id: "finished-new", name: "Cup semifinal", opponentName: "Chiba HC", teamSide: "away" as const, scheduledAt: "2026-08-25T09:00:00.000Z", venue: "Main Gym", status: "finished" as const, homeScore: 24, awayScore: 28 },
      { id: "finished-old", name: "Cup quarterfinal", opponentName: "Saitama HC", teamSide: "home" as const, scheduledAt: "2026-08-20T09:00:00.000Z", venue: null, status: "finished" as const, homeScore: 22, awayScore: 22 },
      { id: "cancelled", name: "Cancelled", opponentName: "Kanagawa HC", teamSide: "home" as const, scheduledAt: "2026-08-27T09:00:00.000Z", venue: null, status: "cancelled" as const, homeScore: 0, awayScore: 0 },
    ];

    const summary = dashboard.buildDashboardSummary({
      now: new Date("2026-08-26T12:00:00.000Z"),
      activeMemberCount: 14,
      matches,
      scorers: [
        { teamMemberId: "p1", displayName: "佐藤", shirtNumber: 9, goals: 12 },
        { teamMemberId: "p2", displayName: "鈴木", shirtNumber: 4, goals: 18 },
        { teamMemberId: "p3", displayName: "高橋", shirtNumber: 11, goals: 7 },
        { teamMemberId: "p4", displayName: "田中", shirtNumber: 2, goals: 3 },
      ],
    });

    expect(summary.nextMatch?.id).toBe("future-1");
    expect(summary.latestResult?.id).toBe("finished-new");
    expect(summary.record).toEqual({ played: 2, wins: 1, draws: 1, losses: 0 });
    expect(summary.activeMemberCount).toBe(14);
    expect(summary.topScorers.map((player: { teamMemberId: string | null }) => player.teamMemberId)).toEqual(["p2", "p1", "p3"]);
  });

  it("can scope only the record to the current season without hiding overall next/recent matches", async () => {
    const { buildDashboardSummary } = await import("./runtime");
    const outsideSeason = { id: "old", name: "Old cup", opponentName: "Old HC", teamSide: "home" as const, scheduledAt: "2026-07-01T09:00:00.000Z", venue: null, status: "finished" as const, homeScore: 20, awayScore: 25 };
    const currentSeason = { id: "current", name: "League", opponentName: "Tokyo HC", teamSide: "away" as const, scheduledAt: "2026-08-20T09:00:00.000Z", venue: null, status: "finished" as const, homeScore: 25, awayScore: 28 };
    const future = { id: "future", name: "Friendly", opponentName: "Yokohama HC", teamSide: "home" as const, scheduledAt: "2026-09-01T09:00:00.000Z", venue: null, status: "scheduled" as const, homeScore: 0, awayScore: 0 };

    const summary = buildDashboardSummary({
      now: new Date("2026-08-26T12:00:00.000Z"),
      activeMemberCount: 12,
      matches: [outsideSeason, currentSeason, future],
      recordMatches: [currentSeason],
      currentSeasonName: "2026",
      scorers: [],
    });

    expect(summary.record).toEqual({ played: 1, wins: 1, draws: 0, losses: 0 });
    expect(summary.latestResult?.id).toBe("current");
    expect(summary.nextMatch?.id).toBe("future");
    expect(summary.currentSeasonName).toBe("2026");
  });
});
