export type PublicPortalMatchStatus = "live" | "scheduled" | "finished";
export type PublicPortalTeamSide = "home" | "away";

export type PublicPortalMatch = {
  matchId: string;
  matchName: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamShortName: string | null;
  opponentName: string;
  teamSide: PublicPortalTeamSide;
  scheduledAt: string;
  venue: string | null;
  status: PublicPortalMatchStatus;
  homeScore: number;
  awayScore: number;
};

export type PublicTeamSearchResult = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  description: string | null;
};
