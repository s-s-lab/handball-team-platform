import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MatchStatus, TeamSide } from "@/features/matches/types";
import { deriveSeasonRecord, type SeasonRecord, type SeasonRecordMatch } from "./runtime";
import {
  mergeSeasonPlayerRows,
  selectSeason,
  type SeasonPlayerViewRow,
  type SeasonSummaryRow,
} from "./data-shaping";

export type SeasonMatchAssignment = {
  id: string;
  name: string;
  opponentName: string;
  scheduledAt: string;
  status: string;
  seasonId: string | null;
};

export type SeasonStatsWorkspace = {
  seasons: SeasonSummaryRow[];
  selectedSeason: SeasonSummaryRow | null;
  record: SeasonRecord;
  players: SeasonPlayerViewRow[];
  matches: SeasonMatchAssignment[];
};

function databaseReadFailure() {
  return new Error("シーズン成績を読み込めませんでした。");
}

const emptyRecord: SeasonRecord = {
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
};

export async function getSeasonStatsWorkspace(
  teamId: string,
  requestedSeasonId?: string | null,
): Promise<SeasonStatsWorkspace> {
  const supabase = await createClient();

  const [{ data: seasonRows, error: seasonsError }, { data: rosterRows, error: rosterError }, { data: matchRows, error: matchesError }] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id, team_id, name, start_date, end_date, is_current")
        .eq("team_id", teamId)
        .order("is_current", { ascending: false })
        .order("start_date", { ascending: false }),
      supabase
        .from("team_members")
        .select("id, full_name, display_name, shirt_number, primary_position, is_active")
        .eq("team_id", teamId)
        .eq("kind", "player"),
      supabase
        .from("matches")
        .select("id, name, opponent_name, scheduled_at, status, season_id, team_side")
        .eq("team_id", teamId)
        .order("scheduled_at", { ascending: false }),
    ]);

  if (seasonsError || rosterError || matchesError) throw databaseReadFailure();

  const seasons: SeasonSummaryRow[] = (seasonRows ?? []).map((season) => ({
    id: season.id,
    teamId: season.team_id,
    name: season.name,
    startDate: season.start_date,
    endDate: season.end_date,
    isCurrent: season.is_current,
  }));
  const selectedSeason = selectSeason(seasons, requestedSeasonId);

  const matches: SeasonMatchAssignment[] = (matchRows ?? []).map((match) => ({
    id: match.id,
    name: match.name,
    opponentName: match.opponent_name,
    scheduledAt: match.scheduled_at,
    status: match.status,
    seasonId: match.season_id,
  }));

  const roster = (rosterRows ?? []).map((member) => ({
    id: member.id,
    fullName: member.full_name,
    displayName: member.display_name,
    shirtNumber: member.shirt_number,
    primaryPosition: member.primary_position,
    isActive: member.is_active,
  }));

  if (!selectedSeason) {
    return {
      seasons,
      selectedSeason: null,
      record: emptyRecord,
      players: mergeSeasonPlayerRows(roster, []),
      matches,
    };
  }

  const selectedMatches = (matchRows ?? []).filter((match) => match.season_id === selectedSeason.id);
  const selectedMatchIds = selectedMatches.map((match) => match.id);

  const [{ data: statRows, error: statsError }, stateResult] = await Promise.all([
    supabase
      .from("season_player_stats")
      .select("team_member_id, appearances, starts, goals, seven_meter_goals, seven_meter_attempts, warnings, two_minute_suspensions, disqualifications, saves, shots_faced, notes")
      .eq("season_id", selectedSeason.id),
    selectedMatchIds.length > 0
      ? supabase
          .from("match_state")
          .select("match_id, home_score, away_score")
          .in("match_id", selectedMatchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (statsError || stateResult.error) throw databaseReadFailure();

  const scoreByMatch = new Map(
    (stateResult.data ?? []).map((state) => [state.match_id, { homeScore: state.home_score, awayScore: state.away_score }]),
  );
  const recordMatches: SeasonRecordMatch[] = selectedMatches.map((match) => {
    const score = scoreByMatch.get(match.id) ?? { homeScore: 0, awayScore: 0 };
    return {
      teamSide: match.team_side as TeamSide,
      status: match.status as MatchStatus,
      homeScore: score.homeScore,
      awayScore: score.awayScore,
    };
  });

  return {
    seasons,
    selectedSeason,
    record: deriveSeasonRecord(recordMatches),
    players: mergeSeasonPlayerRows(roster, statRows ?? []),
    matches,
  };
}
