import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getTeamForCurrentUser, getSeasonStatsWorkspace } = vi.hoisted(() => ({
  getTeamForCurrentUser: vi.fn(),
  getSeasonStatsWorkspace: vi.fn(),
}));

vi.mock("@/features/team-core/data", () => ({ getTeamForCurrentUser }));
vi.mock("@/features/season-stats/data", () => ({ getSeasonStatsWorkspace }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

const team = {
  id: "team-1",
  organizationId: "org-1",
  name: "青山HC",
  slug: "aoyama",
  shortName: null,
  description: null,
  isPublic: false,
  role: "admin",
  roster: [],
};

const workspace = {
  seasons: [{ id: "s1", teamId: "team-1", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31", isCurrent: true }],
  selectedSeason: { id: "s1", teamId: "team-1", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31", isCurrent: true },
  record: { played: 2, wins: 2, draws: 0, losses: 0, goalsFor: 61, goalsAgainst: 54, goalDifference: 7 },
  players: [],
  matches: [],
};

describe("TeamStatsPage", () => {
  it("loads the selected season and renders the stats workspace", async () => {
    getTeamForCurrentUser.mockResolvedValue(team);
    getSeasonStatsWorkspace.mockResolvedValue(workspace);

    const loaded = await import("./page").catch(() => null);
    expect(loaded?.default).toBeTypeOf("function");
    if (!loaded?.default) return;

    const node = await loaded.default({
      params: Promise.resolve({ teamId: "team-1" }),
      searchParams: Promise.resolve({ season: "s1" }),
    });
    const html = renderToStaticMarkup(node);

    expect(getSeasonStatsWorkspace).toHaveBeenCalledWith("team-1", "s1");
    expect(html).toContain("成績");
    expect(html).toContain("2勝 0分 0敗");
  });

  it("rejects users without team membership", async () => {
    getTeamForCurrentUser.mockResolvedValue({ ...team, role: null });
    const loaded = await import("./page");

    await expect(loaded.default({
      params: Promise.resolve({ teamId: "team-1" }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow("not-found");
  });
});
