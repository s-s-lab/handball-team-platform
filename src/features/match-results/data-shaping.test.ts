import { describe, expect, it } from "vitest";

describe("match result data shaping", () => {
  it("joins match metadata with score state and defaults missing state to zero", async () => {
    const loaded = await import("./data-shaping").catch(() => null);
    expect(loaded?.mapTeamMatchResultRows).toBeTypeOf("function");
    if (!loaded?.mapTeamMatchResultRows) return;

    const result = loaded.mapTeamMatchResultRows(
      [
        {
          id: "match-1",
          team_id: "team-1",
          name: "関東リーグ",
          competition_name: "関東学生リーグ",
          opponent_name: "東京HC",
          team_side: "home",
          scheduled_at: "2026-08-20T09:00:00.000Z",
          venue: "青山体育館",
          status: "finished",
          is_public: true,
          completed_at: "2026-08-20T10:10:00.000Z",
          result_source: "manual",
        },
        {
          id: "match-2",
          team_id: "team-1",
          name: "練習試合",
          competition_name: null,
          opponent_name: "横浜HC",
          team_side: "away",
          scheduled_at: "2026-09-01T09:00:00.000Z",
          venue: null,
          status: "scheduled",
          is_public: false,
          completed_at: null,
          result_source: "console",
        },
      ],
      [{ match_id: "match-1", home_score: 31, away_score: 28 }],
    );

    expect(result[0]).toEqual({
      id: "match-1",
      teamId: "team-1",
      name: "関東リーグ",
      competitionName: "関東学生リーグ",
      opponentName: "東京HC",
      teamSide: "home",
      scheduledAt: "2026-08-20T09:00:00.000Z",
      venue: "青山体育館",
      status: "finished",
      isPublic: true,
      completedAt: "2026-08-20T10:10:00.000Z",
      resultSource: "manual",
      homeScore: 31,
      awayScore: 28,
    });
    expect(result[1]?.homeScore).toBe(0);
    expect(result[1]?.awayScore).toBe(0);
  });
});
