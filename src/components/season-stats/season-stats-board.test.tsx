import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

const seasons = [
  { id: "season-2026", teamId: "team-1", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31", isCurrent: true },
  { id: "season-2025", teamId: "team-1", name: "2025", startDate: "2025-01-01", endDate: "2025-12-31", isCurrent: false },
];

const players = [
  { teamMemberId: "p1", displayName: "佐藤 健", shirtNumber: 7, primaryPosition: "CB", appearances: 8, starts: 7, goals: 42, sevenMeterGoals: 5, sevenMeterAttempts: 6, warnings: 1, twoMinuteSuspensions: 2, disqualifications: 0, saves: 0, shotsFaced: 0, notes: null },
  { teamMemberId: "p2", displayName: "鈴木 翔", shirtNumber: 1, primaryPosition: "GK", appearances: 8, starts: 8, goals: 0, sevenMeterGoals: 0, sevenMeterAttempts: 0, warnings: 0, twoMinuteSuspensions: 0, disqualifications: 0, saves: 76, shotsFaced: 181, notes: null },
];

const matches = [
  { id: "m1", name: "秋季リーグ 第1節", opponentName: "東京HC", scheduledAt: "2026-08-20T09:00:00.000Z", status: "finished", seasonId: "season-2026" },
  { id: "m2", name: "練習試合", opponentName: "横浜HC", scheduledAt: "2026-08-25T09:00:00.000Z", status: "finished", seasonId: null },
];

describe("SeasonStatsBoard", () => {
  it("renders season record, rankings and admin editing controls", async () => {
    const loaded = await import("./season-stats-board").catch(() => null);
    expect(loaded?.SeasonStatsBoard).toBeTypeOf("function");
    if (!loaded?.SeasonStatsBoard) return;

    const html = renderToStaticMarkup(loaded.SeasonStatsBoard({
      teamId: "team-1",
      teamName: "青山HC",
      isAdmin: true,
      seasons,
      selectedSeason: seasons[0],
      record: { played: 8, wins: 6, draws: 1, losses: 1, goalsFor: 244, goalsAgainst: 216, goalDifference: 28 },
      players,
      matches,
    }));
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("成績");
    expect(text).toContain("2026");
    expect(text).toContain("6勝 1分 1敗");
    expect(text).toContain("得点ランキング");
    expect(text).toContain("佐藤 健");
    expect(text).toContain("42");
    expect(text).toContain("GKセーブ");
    expect(text).toContain("42.0%");
    expect(text).toContain("選手成績を編集");
    expect(text).toContain("試合をシーズンに紐付け");
    expect(text).toContain("新しいシーズン");
    expect(html).toContain('name="appearances:p1"');
    expect(html).toContain('name="seasonId:m2"');
  });
});
