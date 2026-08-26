import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getTeamForCurrentUser } from "@/features/team-core/data";
import type { HandballPosition, MembershipRole, TeamMemberRecord } from "@/features/team-core/types";
import type { MatchStatus } from "@/features/matches/types";
import { buildMemberAppearances, type MemberAppearance } from "./profile-runtime";

export type MemberProfileData = {
  team: {
    id: string;
    name: string;
    slug: string;
  };
  member: TeamMemberRecord;
  role: MembershipRole;
  appearances: MemberAppearance[];
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
  const { data: rosterRows, error: rosterError } = await supabase
    .from("match_rosters")
    .select("match_id, shirt_number_snapshot, primary_position_snapshot")
    .eq("team_member_id", memberId);

  if (rosterError) throw databaseReadFailure();

  const matchIds = [...new Set((rosterRows ?? []).map((row) => row.match_id))];
  if (matchIds.length === 0) {
    return {
      team: { id: team.id, name: team.name, slug: team.slug },
      member,
      role: team.role,
      appearances: [],
    };
  }

  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("id, name, opponent_name, scheduled_at, venue, status")
    .eq("team_id", teamId)
    .in("id", matchIds);

  if (matchError) throw databaseReadFailure();

  const appearances = buildMemberAppearances({
    member,
    rosterRows: (rosterRows ?? []).map((row) => ({
      matchId: row.match_id,
      shirtNumberSnapshot: row.shirt_number_snapshot,
      primaryPositionSnapshot: row.primary_position_snapshot as HandballPosition | null,
    })),
    matches: (matches ?? []).map((match) => ({
      id: match.id,
      name: match.name,
      opponentName: match.opponent_name,
      scheduledAt: match.scheduled_at,
      venue: match.venue,
      status: match.status as MatchStatus,
    })),
  }).slice(0, 8);

  return {
    team: { id: team.id, name: team.name, slug: team.slug },
    member,
    role: team.role,
    appearances,
  };
}
