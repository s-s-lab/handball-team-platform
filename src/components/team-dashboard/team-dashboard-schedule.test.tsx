import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamDashboard } from "./team-dashboard";

describe("TeamDashboard schedule integration", () => {
  it("prefers the next team activity and links a synced match to match detail", () => {
    const html = renderToStaticMarkup(
      <TeamDashboard
        team={{ id: "team-1", name: "Team", shortName: null, slug: "team", description: null, isPublic: false }}
        isAdmin
        summary={{
          nextMatch: null,
          latestResult: null,
          record: { played: 0, wins: 0, draws: 0, losses: 0 },
          activeMemberCount: 0,
          topScorers: [],
        }}
        nextActivity={{
          id: "event-1",
          teamId: "team-1",
          linkedMatchId: "match-1",
          eventType: "official_match",
          title: "関東リーグ vs 東京HC",
          startsAt: "2026-08-29T09:00:00.000Z",
          endsAt: null,
          venue: "青山記念館",
          memo: null,
          status: "scheduled",
        }}
      />,
    );
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("次の予定");
    expect(text).toContain("関東リーグ vs 東京HC");
    expect(text).toContain("公式戦");
    expect(html).toContain('/app/matches/match-1');
    expect(html).toContain('/app/teams/team-1/schedule/new');
  });
});
