import type { MatchStatus, TeamSide } from "@/features/matches/types";
import type { MatchResultSource, TeamMatchResultItem } from "./types";

type MatchRow = {
  id: string;
  team_id: string;
  name: string;
  competition_name: string | null;
  opponent_name: string;
  team_side: string;
  scheduled_at: string;
  venue: string | null;
  status: string;
  is_public: boolean;
  completed_at: string | null;
  result_source: string;
  season_id: string | null;
};

type StateRow = {
  match_id: string;
  home_score: number;
  away_score: number;
};

type SeasonRow = {
  id: string;
  name: string;
};

export function mapTeamMatchResultRows(
  matchRows: MatchRow[],
  stateRows: StateRow[],
  seasonRows: SeasonRow[] = [],
): TeamMatchResultItem[] {
  const scoreByMatch = new Map(stateRows.map((state) => [state.match_id, state]));
  const seasonById = new Map(seasonRows.map((season) => [season.id, season.name]));

  return matchRows.map((match) => {
    const score = scoreByMatch.get(match.id);
    return {
      id: match.id,
      teamId: match.team_id,
      name: match.name,
      competitionName: match.competition_name,
      opponentName: match.opponent_name,
      teamSide: match.team_side as TeamSide,
      scheduledAt: match.scheduled_at,
      venue: match.venue,
      status: match.status as MatchStatus,
      isPublic: match.is_public,
      completedAt: match.completed_at,
      resultSource: match.result_source as MatchResultSource,
      seasonId: match.season_id,
      seasonName: match.season_id ? seasonById.get(match.season_id) ?? null : null,
      homeScore: score?.home_score ?? 0,
      awayScore: score?.away_score ?? 0,
    };
  });
}
