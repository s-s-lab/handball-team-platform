import { describe, expect, it } from "vitest";
import { mergeSeasonPlayerRows, selectSeason } from "./data-shaping";

const seasons = [
  { id: "s2", teamId: "team-1", name: "2025", startDate: "2025-01-01", endDate: "2025-12-31", isCurrent: false },
  { id: "s1", teamId: "team-1", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31", isCurrent: true },
];

describe("season stats data shaping", () => {
  it("uses requested season when valid, otherwise current season", () => {
    expect(selectSeason(seasons, "s2")?.id).toBe("s2");
    expect(selectSeason(seasons, "missing")?.id).toBe("s1");
    expect(selectSeason(seasons, null)?.id).toBe("s1");
    expect(selectSeason([], null)).toBeNull();
  });

  it("merges roster players with saved stats and keeps inactive historical players", () => {
    const roster = [
      { id: "p1", fullName: "佐藤 健", displayName: null, shirtNumber: 7, primaryPosition: "CB", isActive: true },
      { id: "p2", fullName: "鈴木 翔", displayName: "翔", shirtNumber: 1, primaryPosition: "GK", isActive: false },
    ];
    const stats = [{
      team_member_id: "p2", appearances: 8, starts: 8, goals: 0, seven_meter_goals: 0,
      seven_meter_attempts: 0, warnings: 0, two_minute_suspensions: 0,
      disqualifications: 0, saves: 76, shots_faced: 181, notes: "昨季主将",
    }];

    expect(mergeSeasonPlayerRows(roster, stats)).toEqual([
      expect.objectContaining({ teamMemberId: "p1", displayName: "佐藤 健", appearances: 0, goals: 0 }),
      expect.objectContaining({ teamMemberId: "p2", displayName: "翔", appearances: 8, saves: 76, notes: "昨季主将" }),
    ]);
  });
});
