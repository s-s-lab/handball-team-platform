import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  MatchListItem,
  MatchRecord,
  MatchRosterRecord,
  MatchRulesRecord,
  MatchStatus,
  TeamSide,
} from "./types";

function databaseReadFailure() {
  return new Error("試合情報を読み込めませんでした。");
}

export async function listTeamMatches(teamId: string): Promise<MatchListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, team_id, name, opponent_name, team_side, scheduled_at, venue, status, is_public")
    .eq("team_id", teamId)
    .order("scheduled_at", { ascending: true });

  if (error) throw databaseReadFailure();

  return (data ?? []).map((match) => ({
    id: match.id,
    teamId: match.team_id,
    name: match.name,
    opponentName: match.opponent_name,
    teamSide: match.team_side as TeamSide,
    scheduledAt: match.scheduled_at,
    venue: match.venue,
    status: match.status as MatchStatus,
    isPublic: match.is_public,
  }));
}

export async function getMatchForCurrentUser(matchId: string): Promise<MatchRecord | null> {
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, team_id, name, opponent_name, team_side, scheduled_at, venue, memo, status, is_public",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) throw databaseReadFailure();
  if (!match) return null;

  const [{ data: rules, error: rulesError }, { data: roster, error: rosterError }] =
    await Promise.all([
      supabase
        .from("match_rules")
        .select(
          "match_id, period_count, period_seconds, halftime_seconds, overtime_enabled, overtime_period_count, overtime_period_seconds, team_timeouts_per_game, team_timeouts_per_period, team_timeout_seconds",
        )
        .eq("match_id", matchId)
        .maybeSingle(),
      supabase
        .from("match_rosters")
        .select(
          "id, match_id, team_member_id, kind, full_name_snapshot, display_name_snapshot, shirt_number_snapshot, primary_position_snapshot",
        )
        .eq("match_id", matchId)
        .order("kind")
        .order("shirt_number_snapshot", { nullsFirst: false })
        .order("full_name_snapshot"),
    ]);

  if (rulesError || rosterError) throw databaseReadFailure();
  if (!rules) return null;

  const mappedRules: MatchRulesRecord = {
    matchId: rules.match_id,
    periodCount: rules.period_count,
    periodSeconds: rules.period_seconds,
    halftimeSeconds: rules.halftime_seconds,
    overtimeEnabled: rules.overtime_enabled,
    overtimePeriodCount: rules.overtime_period_count,
    overtimePeriodSeconds: rules.overtime_period_seconds,
    teamTimeoutsPerGame: rules.team_timeouts_per_game,
    teamTimeoutsPerPeriod: rules.team_timeouts_per_period,
    teamTimeoutSeconds: rules.team_timeout_seconds,
  };

  const mappedRoster: MatchRosterRecord[] = (roster ?? []).map((member) => ({
    id: member.id,
    matchId: member.match_id,
    teamMemberId: member.team_member_id,
    kind: member.kind as "player" | "staff",
    fullNameSnapshot: member.full_name_snapshot,
    displayNameSnapshot: member.display_name_snapshot,
    shirtNumberSnapshot: member.shirt_number_snapshot,
    primaryPositionSnapshot: member.primary_position_snapshot,
  }));

  return {
    id: match.id,
    teamId: match.team_id,
    name: match.name,
    opponentName: match.opponent_name,
    teamSide: match.team_side as TeamSide,
    scheduledAt: match.scheduled_at,
    venue: match.venue,
    memo: match.memo,
    status: match.status as MatchStatus,
    isPublic: match.is_public,
    rules: mappedRules,
    roster: mappedRoster,
  };
}
