import { describe, expect, it } from "vitest";
import {
  deriveSeasonRecord,
  goalsPerAppearance,
  savePercentage,
  sortGoalkeeperLeaderboard,
  sortScoringLeaderboard,
} from "./runtime";

const matches = [
  { teamSide: "home" as const, status: "finished" as const, homeScore: 31, awayScore: 28 },
  { teamSide: "away" as const, status: "finished" as const, homeScore: 25, awayScore: 25 },
  { teamSide: "away" as const, status: "finished" as const, homeScore: 29, awayScore: 27 },
  { teamSide: "home" as const, status: "scheduled" as const, homeScore: 0, awayScore: 0 },
];

const stats = [
  { teamMemberId: "a", displayName: "A", shirtNumber: 9, appearances: 4, goals: 20, saves: 0, shotsFaced: 0 },
  { teamMemberId: "b", displayName: "B", shirtNumber: 2, appearances: 5, goals: 20, saves: 18, shotsFaced: 30 },
  { teamMemberId: "c", displayName: "C", shirtNumber: 1, appearances: 3, goals: 2, saves: 24, shotsFaced: 30 },
];

describe("season statistics runtime", () => {
  it("derives W-D-L and goals for/against from finished matches only", () => {
    expect(deriveSeasonRecord(matches)).toEqual({
      played: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      goalsFor: 83,
      goalsAgainst: 82,
      goalDifference: 1,
    });
  });

  it("derives percentages and per-appearance rates without divide-by-zero", () => {
    expect(savePercentage(24, 30)).toBe(80);
    expect(savePercentage(0, 0)).toBeNull();
    expect(goalsPerAppearance(20, 4)).toBe(5);
    expect(goalsPerAppearance(0, 0)).toBeNull();
  });

  it("sorts scoring leaderboard by goals, then goals per appearance, then shirt number", () => {
    expect(sortScoringLeaderboard(stats).map((row) => row.teamMemberId)).toEqual(["a", "b", "c"]);
  });

  it("sorts goalkeepers by save percentage and excludes rows without shots faced", () => {
    expect(sortGoalkeeperLeaderboard(stats).map((row) => row.teamMemberId)).toEqual(["c", "b"]);
  });
});
