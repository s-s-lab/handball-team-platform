import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getTeamForCurrentUser, listTeamMatchResults } = vi.hoisted(() => ({
  getTeamForCurrentUser: vi.fn(),
  listTeamMatchResults: vi.fn(),
}));

vi.mock("@/features/team-core/data", () => ({ getTeamForCurrentUser }));
vi.mock("@/features/match-results/data", () => ({ listTeamMatchResults }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

describe("TeamMatchesPage", () => {
  it("loads the team match workspace for an authenticated team member", async () => {
    getTeamForCurrentUser.mockResolvedValue({
      id: "team-1",
      name: "青山HC",
      role: "admin",
      roster: [],
    });
    listTeamMatchResults.mockResolvedValue([
      {
        id: "finished",
        teamId: "team-1",
        name: "秋季リーグ 第2節",
        competitionName: "関東学生リーグ",
        opponentName: "横浜HC",
        teamSide: "home",
        scheduledAt: "2026-08-20T09:00:00.000Z",
        venue: "横浜体育館",
        status: "finished",
        isPublic: false,
        completedAt: "2026-08-20T10:00:00.000Z",
        resultSource: "manual",
        homeScore: 31,
        awayScore: 28,
      },
    ]);

    const loaded = await import("./page").catch(() => null);
    expect(loaded?.default).toBeTypeOf("function");
    if (!loaded?.default) return;

    const node = await loaded.default({ params: Promise.resolve({ teamId: "team-1" }) });
    const html = renderToStaticMarkup(node);
    const text = html.replace(/<[^>]+>/g, "");

    expect(getTeamForCurrentUser).toHaveBeenCalledWith("team-1");
    expect(listTeamMatchResults).toHaveBeenCalledWith("team-1");
    expect(text).toContain("試合");
    expect(text).toContain("横浜HC");
    expect(text).toContain("31");
  });
});
