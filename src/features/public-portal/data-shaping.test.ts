import { describe, expect, it } from "vitest";
import {
  groupPublicPortalMatches,
  shapePublicPortalMatches,
  shapePublicTeamSearchResults,
} from "./data-shaping";

const validMatch = {
  match_id: "66000000-0000-4000-8000-000000000001",
  match_name: "League Match",
  team_id: "66000000-0000-4000-8000-000000000002",
  team_name: "Blue Handball",
  team_slug: "blue-handball",
  team_short_name: "BLUE",
  opponent_name: "Red Handball",
  team_side: "home",
  scheduled_at: "2026-08-26T10:00:00+00:00",
  venue: "Main Gym",
  status: "live",
  home_score: 7,
  away_score: 6,
};

describe("shapePublicPortalMatches", () => {
  it("maps valid safe portal rows and filters malformed rows", () => {
    const result = shapePublicPortalMatches([
      validMatch,
      { ...validMatch, match_id: "bad" },
      { ...validMatch, scheduled_at: "not-a-date" },
      { ...validMatch, status: "cancelled" },
      { ...validMatch, home_score: "seven" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      matchId: validMatch.match_id,
      matchName: "League Match",
      teamId: validMatch.team_id,
      teamName: "Blue Handball",
      teamSlug: "blue-handball",
      teamShortName: "BLUE",
      opponentName: "Red Handball",
      teamSide: "home",
      scheduledAt: validMatch.scheduled_at,
      venue: "Main Gym",
      status: "live",
      homeScore: 7,
      awayScore: 6,
    });
  });

  it("rejects negative or non-integer scores", () => {
    expect(
      shapePublicPortalMatches([
        { ...validMatch, home_score: -1 },
        { ...validMatch, match_id: "66000000-0000-4000-8000-000000000006", away_score: 1.5 },
      ]),
    ).toEqual([]);
  });
});

describe("shapePublicTeamSearchResults", () => {
  it("maps only valid team identity rows", () => {
    expect(
      shapePublicTeamSearchResults([
        {
          id: "66000000-0000-4000-8000-000000000003",
          name: "Blue Handball",
          slug: "blue-handball",
          short_name: "BLUE",
          description: "Tokyo handball team",
        },
        { id: "bad", name: "Broken", slug: "broken", short_name: null, description: null },
      ]),
    ).toEqual([
      {
        id: "66000000-0000-4000-8000-000000000003",
        name: "Blue Handball",
        slug: "blue-handball",
        shortName: "BLUE",
        description: "Tokyo handball team",
      },
    ]);
  });

  it("rejects malformed slugs and nullable field types", () => {
    expect(
      shapePublicTeamSearchResults([
        {
          id: "66000000-0000-4000-8000-000000000007",
          name: "Blue Handball",
          slug: "Blue Handball",
          short_name: null,
          description: null,
        },
        {
          id: "66000000-0000-4000-8000-000000000008",
          name: "Blue Handball",
          slug: "blue-handball",
          short_name: 42,
          description: null,
        },
      ]),
    ).toEqual([]);
  });
});

describe("groupPublicPortalMatches", () => {
  it("keeps live, scheduled and finished matches separate", () => {
    const matches = shapePublicPortalMatches([
      validMatch,
      { ...validMatch, match_id: "66000000-0000-4000-8000-000000000004", status: "scheduled" },
      { ...validMatch, match_id: "66000000-0000-4000-8000-000000000005", status: "finished" },
    ]);

    const grouped = groupPublicPortalMatches(matches);
    expect(grouped.live.map((match) => match.status)).toEqual(["live"]);
    expect(grouped.scheduled.map((match) => match.status)).toEqual(["scheduled"]);
    expect(grouped.finished.map((match) => match.status)).toEqual(["finished"]);
  });
});
