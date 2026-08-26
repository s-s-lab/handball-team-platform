import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  MatchListItem,
  MatchRecord,
  MatchResultSource,
  MatchRosterCandidate,
  MatchRosterRecord,
  MatchRosterSelection,
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
      "id, team_id, name, competition_name, opponent_name, team_side, scheduled_at, venue, memo, status, is_public, completed_at, result_source",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) throw databaseReadFailure();
  if (!match) return null;

  const [
    { data: rules, error: rulesError },
    { data: roster, error: rosterError },
    { data: state, error: stateError },
  ] = await Promise.all([
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
    supabase
      .from("match_state")
      .select("home_score, away_score")
      .eq("match_id", matchId)
      .maybeSingle(),
  ]);

  if (rulesError || rosterError || stateError) throw databaseReadFailure();
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
    competitionName: match.competition_name,
    opponentName: match.opponent_name,
    teamSide: match.team_side as TeamSide,
    scheduledAt: match.scheduled_at,
    venue: match.venue,
    memo: match.memo,
    status: match.status as MatchStatus,
    isPublic: match.is_public,
    completedAt: match.completed_at,
    resultSource: match.result_source as MatchResultSource,
    homeScore: state?.home_score ?? 0,
    awayScore: state?.away_score ?? 0,
    rules: mappedRules,
    roster: mappedRoster,
  };
}

export async function listActiveTeamMembersForMatch(
  matchId: string,
): Promise<MatchRosterSelection | null> {
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, team_id, name, opponent_name, roster_configured_at")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) throw databaseReadFailure();
  if (!match) return null;

  const [{ data: candidates, error: candidatesError }, { data: snapshots, error: snapshotsError }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("id, kind, full_name, display_name, shirt_number, primary_position")
        .eq("team_id", match.team_id)
        .eq("is_active", true)
        .order("kind")
        .order("shirt_number", { nullsFirst: false })
        .order("full_name"),
      supabase
        .from("match_rosters")
        .select("team_member_id")
        .eq("match_id", matchId),
    ]);

  if (candidatesError || snapshotsError) throw databaseReadFailure();

  const mappedCandidates: MatchRosterCandidate[] = (candidates ?? []).map((member) => ({
    id: member.id,
    kind: member.kind as "player" | "staff",
    fullName: member.full_name,
    displayName: member.display_name,
    shirtNumber: member.shirt_number,
    primaryPosition: member.primary_position,
  }));

  const hasConfiguredRoster = Boolean(match.roster_configured_at);
  const savedIds = (snapshots ?? [])
    .map((snapshot) => snapshot.team_member_id)
    .filter((value): value is string => typeof value === "string");

  return {
    matchId: match.id,
    teamId: match.team_id,
    matchName: match.name,
    opponentName: match.opponent_name,
    candidates: mappedCandidates,
    selectedIds: hasConfiguredRoster ? savedIds : mappedCandidates.map((member) => member.id),
    hasConfiguredRoster,
  };
}
