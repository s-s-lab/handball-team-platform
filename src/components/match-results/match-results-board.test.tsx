import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { TeamMatchResultItem } from "@/features/match-results/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => React.createElement("a", { href, ...props }, children),
}));

const matches: TeamMatchResultItem[] = [
  {
    id: "future",
    teamId: "team-1",
    name: "秋季リーグ 第3節",
    competitionName: "関東学生リーグ",
    opponentName: "東京HC",
    teamSide: "home",
    scheduledAt: "2026-09-01T09:00:00.000Z",
    venue: "青山体育館",
    status: "scheduled",
    isPublic: false,
    completedAt: null,
    resultSource: "console",
    seasonId: "season-2026",
    seasonName: "2026",
    homeScore: 0,
    awayScore: 0,
  },
  {
    id: "finished",
    teamId: "team-1",
    name: "秋季リーグ 第2節",
    competitionName: "関東学生リーグ",
    opponentName: "横浜HC",
    teamSide: "away",
    scheduledAt: "2026-08-20T09:00:00.000Z",
    venue: "横浜体育館",
    status: "finished",
    isPublic: true,
    completedAt: "2026-08-20T10:10:00.000Z",
    resultSource: "manual",
    seasonId: "season-2026",
    seasonName: "2026",
    homeScore: 28,
    awayScore: 31,
  },
];

describe("MatchResultsBoard", () => {
  it("renders upcoming matches, completed scores, seasons and admin actions", async () => {
    const loaded = await import("./match-results-board").catch(() => null);
    expect(loaded?.MatchResultsBoard).toBeTypeOf("function");
    if (!loaded?.MatchResultsBoard) return;

    const html = renderToStaticMarkup(loaded.MatchResultsBoard({ teamId: "team-1", teamName: "青山HC", matches, isAdmin: true }));
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("試合");
    expect(text).toContain("これから");
    expect(text).toContain("結果");
    expect(text).toContain("東京HC");
    expect(text).toContain("横浜HC");
    expect(text).toContain("31");
    expect(text).toContain("28");
    expect(text).toContain("WIN");
    expect(text).toContain("2026 SEASON");
    expect(text).toContain("過去の結果を登録");
    expect(html).toContain('/app/teams/team-1/matches/new');
    expect(html).toContain('/app/teams/team-1/matches/history/new');
    expect(html).toContain('/app/matches/finished');
  });
});
