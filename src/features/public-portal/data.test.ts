import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/public-client", () => ({
  createPublicClient: () => ({ rpc }),
}));

import { getPublicPortalMatches, searchPublicTeams } from "./data";

const portalRow = {
  match_id: "66000000-0000-4000-8000-000000000011",
  match_name: "Portal Match",
  team_id: "66000000-0000-4000-8000-000000000012",
  team_name: "Portal Team",
  team_slug: "portal-team",
  team_short_name: "PT",
  opponent_name: "Opponent",
  team_side: "home",
  scheduled_at: "2026-08-26T10:00:00+00:00",
  venue: null,
  status: "live",
  home_score: 3,
  away_score: 2,
};

beforeEach(() => {
  rpc.mockReset();
});

describe("getPublicPortalMatches", () => {
  it("calls the public portal RPC and shapes rows", async () => {
    rpc.mockResolvedValue({ data: [portalRow], error: null });

    await expect(getPublicPortalMatches()).resolves.toEqual([
      {
        matchId: portalRow.match_id,
        matchName: "Portal Match",
        teamId: portalRow.team_id,
        teamName: "Portal Team",
        teamSlug: "portal-team",
        teamShortName: "PT",
        opponentName: "Opponent",
        teamSide: "home",
        scheduledAt: portalRow.scheduled_at,
        venue: null,
        status: "live",
        homeScore: 3,
        awayScore: 2,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("get_public_portal_matches");
  });

  it("fails soft when the portal RPC errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(getPublicPortalMatches()).resolves.toEqual([]);
  });
});

describe("searchPublicTeams", () => {
  it("does not call Supabase for a blank query", async () => {
    await expect(searchPublicTeams("   ")).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("trims the query and shapes public team rows", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: "66000000-0000-4000-8000-000000000013",
          name: "Portal Team",
          slug: "portal-team",
          short_name: "PT",
          description: null,
        },
      ],
      error: null,
    });

    await expect(searchPublicTeams("  PT  ")).resolves.toEqual([
      {
        id: "66000000-0000-4000-8000-000000000013",
        name: "Portal Team",
        slug: "portal-team",
        shortName: "PT",
        description: null,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("search_public_teams", { p_query: "PT" });
  });
});
