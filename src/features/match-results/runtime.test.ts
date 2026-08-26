import { describe, expect, it } from "vitest";

const matches = [
  {
    id: "scheduled-late",
    teamSide: "away" as const,
    scheduledAt: "2026-09-10T09:00:00.000Z",
    status: "scheduled" as const,
    homeScore: 0,
    awayScore: 0,
  },
  {
    id: "live",
    teamSide: "home" as const,
    scheduledAt: "2026-08-27T09:00:00.000Z",
    status: "live" as const,
    homeScore: 12,
    awayScore: 10,
  },
  {
    id: "scheduled-soon",
    teamSide: "home" as const,
    scheduledAt: "2026-09-01T09:00:00.000Z",
    status: "scheduled" as const,
    homeScore: 0,
    awayScore: 0,
  },
  {
    id: "finished-old",
    teamSide: "home" as const,
    scheduledAt: "2026-07-01T09:00:00.000Z",
    status: "finished" as const,
    homeScore: 25,
    awayScore: 25,
  },
  {
    id: "finished-new",
    teamSide: "away" as const,
    scheduledAt: "2026-08-20T09:00:00.000Z",
    status: "finished" as const,
    homeScore: 27,
    awayScore: 30,
  },
  {
    id: "cancelled",
    teamSide: "home" as const,
    scheduledAt: "2026-08-30T09:00:00.000Z",
    status: "cancelled" as const,
    homeScore: 0,
    awayScore: 0,
  },
];

describe("match result runtime", () => {
  it("maps the final score from the selected team side", async () => {
    const loaded = await import("./runtime").catch(() => null);
    expect(loaded?.scoreForTeam).toBeTypeOf("function");
    if (!loaded?.scoreForTeam) return;

    expect(loaded.scoreForTeam({ teamSide: "home", homeScore: 31, awayScore: 28 })).toEqual({ team: 31, opponent: 28 });
    expect(loaded.scoreForTeam({ teamSide: "away", homeScore: 31, awayScore: 28 })).toEqual({ team: 28, opponent: 31 });
  });

  it("classifies completed results as win, draw or loss", async () => {
    const loaded = await import("./runtime").catch(() => null);
    expect(loaded?.classifyMatchResult).toBeTypeOf("function");
    if (!loaded?.classifyMatchResult) return;

    expect(loaded.classifyMatchResult({ teamSide: "away", homeScore: 27, awayScore: 30 })).toBe("win");
    expect(loaded.classifyMatchResult({ teamSide: "home", homeScore: 25, awayScore: 25 })).toBe("draw");
    expect(loaded.classifyMatchResult({ teamSide: "home", homeScore: 20, awayScore: 22 })).toBe("loss");
  });

  it("separates live/upcoming matches from completed results with useful ordering", async () => {
    const loaded = await import("./runtime").catch(() => null);
    expect(loaded?.splitTeamMatches).toBeTypeOf("function");
    if (!loaded?.splitTeamMatches) return;

    const split = loaded.splitTeamMatches(matches);
    expect(split.upcoming.map((match: { id: string }) => match.id)).toEqual(["live", "scheduled-soon", "scheduled-late"]);
    expect(split.results.map((match: { id: string }) => match.id)).toEqual(["finished-new", "finished-old"]);
    expect(split.cancelled.map((match: { id: string }) => match.id)).toEqual(["cancelled"]);
  });
});
