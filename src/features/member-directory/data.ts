import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getTeamForCurrentUser } from "@/features/team-core/data";
import type { HandballPosition, MembershipRole, TeamMemberRecord } from "@/features/team-core/types";
import type { MatchStatus } from "@/features/matches/types";
import { buildMemberAppearances, type MemberAppearance } from "./profile-runtime";

export type MemberSeasonStats = {
  seasonId: string;
  seasonName: string;
  isCurrent: boolean;
  appearances: number;
  starts: number;
  goals: number;
  sevenMeterGoals: number;
  sevenMeterAttempts: number;
  warnings: number;
  twoMinuteSuspensions: number;
  disqualifications: number;
  saves: number;
  shotsFaced: number;
};

export type MemberProfileData = {
  team: {
    id: string;
    name: string;
    slug: string;
  };
  member: TeamMemberRecord;
  role: MembershipRole;
  appearances: MemberAppearance[];
  seasonStats: MemberSeasonStats[];
};

function databaseReadFailure() {
  return new Error("メンバープロフィールを読み込めませんでした。");
}

export async function getMemberProfileForCurrentUser(
  teamId: string,
  memberId: string,
): Promise<MemberProfileData | null> {
  const team = await getTeamForCurrentUser(teamId);
  if (!team?.role) return null;

  const member = team.roster.find((candidate) => candidate.id === memberId);
  if (!member) return null;

  const supabase = await createClient();
  const [rosterResult, statsResult] = await Promise.all([
    supabase
      .from("match_rosters")
      .select("match_id, shirt_number_snapshot, primary_position_snapshot")
      .eq("team_member_id", memberId),
    supabase
      .from("season_player_stats")
      .select("season_id, appearances, starts, goals, seven_meter_goals, seven_meter_attempts, warnings, two_minute_suspensions, disqualifications, saves, shots_faced")
      .eq("team_member_id", memberId),
  ]);

  if (rosterResult.error || statsResult.error) throw databaseReadFailure();

  const rosterRows = rosterResult.data ?? [];
  const statRows = statsResult.data ?? [];
  const matchIds = [...new Set(rosterRows.map((row) => row.match_id))];
  const seasonIds = [...new Set(statRows.map((row) => row.season_id))];

  const [matchesResult, seasonsResult] = await Promise.all([
    matchIds.length > 0
      ? supabase
          .from("matches")
          .select("id, name, opponent_name, scheduled_at, venue, status")
          .eq("team_id", teamId)
          .in("id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    seasonIds.length > 0
      ? supabase
          .from("seasons")
          .select("id, name, is_current")
          .eq("team_id", teamId)
          .in("id", seasonIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (matchesResult.error || seasonsResult.error) throw databaseReadFailure();

  const appearances = buildMemberAppearances({
    member,
    rosterRows: rosterRows.map((row) => ({
      matchId: row.match_id,
      shirtNumberSnapshot: row.shirt_number_snapshot,
      primaryPositionSnapshot: row.primary_position_snapshot as HandballPosition | null,
    })),
    matches: (matchesResult.data ?? []).map((match) => ({
      id: match.id,
      name: match.name,
      opponentName: match.opponent_name,
      scheduledAt: match.scheduled_at,
      venue: match.venue,
      status: match.status as MatchStatus,
    })),
  }).slice(0, 8);

  const seasonById = new Map(
    (seasonsResult.data ?? []).map((season) => [
      season.id,
      { name: season.name, isCurrent: season.is_current },
    ]),
  );

  const seasonStats: MemberSeasonStats[] = statRows
    .map((row) => {
      const season = seasonById.get(row.season_id);
      if (!season) return null;
      return {
        seasonId: row.season_id,
        seasonName: season.name,
        isCurrent: season.isCurrent,
        appearances: row.appearances,
        starts: row.starts,
        goals: row.goals,
        sevenMeterGoals: row.seven_meter_goals,
        sevenMeterAttempts: row.seven_meter_attempts,
        warnings: row.warnings,
        twoMinuteSuspensions: row.two_minute_suspensions,
        disqualifications: row.disqualifications,
        saves: row.saves,
        shotsFaced: row.shots_faced,
      } satisfies MemberSeasonStats;
    })
    .filter((row): row is MemberSeasonStats => row !== null)
    .sort((left, right) => {
      if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1;
      return right.seasonName.localeCompare(left.seasonName, "ja", { numeric: true });
    });

  return {
    team: { id: team.id, name: team.name, slug: team.slug },
    member,
    role: team.role,
    appearances,
    seasonStats,
  };
}
