import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getPublicPortalMatches, searchPublicTeams } = vi.hoisted(() => ({
  getPublicPortalMatches: vi.fn(),
  searchPublicTeams: vi.fn(),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...props }, children),
  };
});

vi.mock("@/features/public-portal/data", () => ({
  getPublicPortalMatches,
  searchPublicTeams,
}));

import HomePage from "./page";

const liveMatch = {
  matchId: "66000000-0000-4000-8000-000000000041",
  matchName: "Portal LIVE",
  teamId: "66000000-0000-4000-8000-000000000042",
  teamName: "Phase 6 Public Handball",
  teamSlug: "phase-6-public-handball",
  teamShortName: "P6SEA",
  opponentName: "Live Opponent",
  teamSide: "home" as const,
  scheduledAt: "2026-08-26T10:00:00+00:00",
  venue: "Main Gym",
  status: "live" as const,
  homeScore: 8,
  awayScore: 7,
};

const teamResult = {
  id: "66000000-0000-4000-8000-000000000042",
  name: "Phase 6 Public Handball",
  slug: "phase-6-public-handball",
  shortName: "P6SEA",
  description: "Public team",
};

describe("HomePage", () => {
  it("renders the real public portal and submitted team search", async () => {
    getPublicPortalMatches.mockResolvedValue([liveMatch]);
    searchPublicTeams.mockResolvedValue([teamResult]);

    const element = await HomePage({
      searchParams: Promise.resolve({ team_q: "  P6SEA  " }),
    });
    const html = renderToStaticMarkup(element);

    expect(getPublicPortalMatches).toHaveBeenCalledOnce();
    expect(searchPublicTeams).toHaveBeenCalledWith("P6SEA");
    expect(html).toContain("TEAM WORKSPACE");
    expect(html).toContain("公開試合");
    expect(html).toContain("チームを探す");
    expect(html).toContain("Phase 6 Public Handball");
    expect(html).toContain('href="/live/66000000-0000-4000-8000-000000000041"');
    expect(html).toContain('href="/teams/phase-6-public-handball"');
    expect(html).not.toContain("MATCH CONSOLE");
  });

  it("does not run a team search for an empty query", async () => {
    getPublicPortalMatches.mockResolvedValue([]);
    searchPublicTeams.mockReset();

    const element = await HomePage({
      searchParams: Promise.resolve({ team_q: "   " }),
    });
    const html = renderToStaticMarkup(element);

    expect(searchPublicTeams).not.toHaveBeenCalled();
    expect(html).toContain("現在LIVE公開中の試合はありません。");
    expect(html).not.toContain("該当する公開チームは見つかりませんでした。");
  });

  it("uses the first value when team_q is repeated and caps it to 100 characters", async () => {
    getPublicPortalMatches.mockResolvedValue([]);
    searchPublicTeams.mockResolvedValue([]);
    searchPublicTeams.mockClear();
    const longQuery = `  ${"a".repeat(120)}  `;

    await HomePage({
      searchParams: Promise.resolve({ team_q: [longQuery, "ignored"] }),
    });

    expect(searchPublicTeams).toHaveBeenCalledWith("a".repeat(100));
  });
});
