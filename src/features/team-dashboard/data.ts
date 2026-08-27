import "server-only";

import { createClient } from "@/lib/supabase/server";
import { deriveMatchRecordSummary } from "@/features/match-records/runtime";
import { mapRecordEventRows } from "@/features/match-records/data-shaping";
import type { RecordEvent } from "@/features/match-records/types";
import type { MatchStatus, TeamSide } from "@/features/matches/types";
import {
  buildDashboardSummary,
  type DashboardMatch,
  type DashboardScorer,
  type TeamDashboardSummary,
} from "./runtime";

function databaseReadFailure() {
  return new Error("ダッシュボード情報を読み込めませんでした。");
}

export async function getTeamDashboardSummary(
  teamId: string,
  activeMemberCount: number,
): Promise<TeamDashboardSummary> {
  const supabase = await createClient();
  const [matchResult, seasonResult] = await Promise.all([
    supabase
      .from("matches")
      .select("id, name, opponent_name, team_side, scheduled_at, venue, status, season_id")
      .eq("team_id", teamId)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("seasons")
      .select("id, name")
      .eq("team_id", teamId)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (matchResult.error || seasonResult.error) throw databaseReadFailure();

  const matchRows = matchResult.data ?? [];
  const currentSeason = seasonResult.data ?? null;
  const matchIds = matchRows.map((match) => match.id);

  const stateResult = matchIds.length > 0
    ? await supabase
        .from("match_state")
        .select("match_id, home_score, away_score")
        .in("match_id", matchIds)
    : { data: [], error: null };

  if (stateResult.error) throw databaseReadFailure();

  const scoreByMatch = new Map(
    (stateResult.data ?? []).map((state) => [
      state.match_id,
      { homeScore: state.home_score, awayScore: state.away_score },
    ]),
  );

  const matches: DashboardMatch[] = matchRows.map((match) => {
    const score = scoreByMatch.get(match.id) ?? { homeScore: 0, awayScore: 0 };
    return {
      id: match.id,
      name: match.name,
      opponentName: match.opponent_name,
      teamSide: match.team_side as TeamSide,
      scheduledAt: match.scheduled_at,
      venue: match.venue,
      status: match.status as MatchStatus,
      homeScore: score.homeScore,
      awayScore: score.awayScore,
    };
  });

  const matchSeasonById = new Map(matchRows.map((match) => [match.id, match.season_id]));
  const recordMatches = currentSeason
    ? matches.filter((match) => matchSeasonById.get(match.id) === currentSeason.id)
    : matches;

  let scorers: DashboardScorer[] = [];

  if (currentSeason) {
    const { data: statRows, error: statError } = await supabase
      .from("season_player_stats")
      .select("team_member_id, goals")
      .eq("season_id", currentSeason.id)
      .gt("goals", 0);

    if (statError) throw databaseReadFailure();

    const memberIds = (statRows ?? []).map((row) => row.team_member_id);
    if (memberIds.length > 0) {
      const { data: memberRows, error: memberError } = await supabase
        .from("team_members")
        .select("id, full_name, display_name, shirt_number")
        .eq("team_id", teamId)
        .in("id", memberIds);

      if (memberError) throw databaseReadFailure();
      const memberById = new Map((memberRows ?? []).map((member) => [member.id, member]));
      scorers = (statRows ?? []).map((row) => {
        const member = memberById.get(row.team_member_id);
        return {
          teamMemberId: row.team_member_id,
          displayName: member?.display_name ?? member?.full_name ?? "選手",
          shirtNumber: member?.shirt_number ?? null,
          goals: row.goals,
        };
      });
    }
  } else {
    const finishedIds = matches.filter((match) => match.status === "finished").map((match) => match.id);
    const eventsByMatch = new Map<string, RecordEvent[]>();

    if (finishedIds.length > 0) {
      const { data: eventRows, error: eventError } = await supabase
        .from("match_events")
        .select(
          "id, match_id, state_version, event_type, related_event_id, period, period_elapsed_ms, competition_elapsed_ms, subject_side, subject_team_member_id, subject_match_roster_id, payload, created_at",
        )
        .in("match_id", finishedIds)
        .order("state_version", { ascending: true });

      if (eventError) throw databaseReadFailure();

      for (const event of mapRecordEventRows(eventRows ?? [])) {
        const current = eventsByMatch.get(event.matchId) ?? [];
        current.push(event);
        eventsByMatch.set(event.matchId, current);
      }
    }

    const scorerMap = new Map<string, DashboardScorer>();
    for (const match of matches) {
      if (match.status !== "finished") continue;
      const summary = deriveMatchRecordSummary(eventsByMatch.get(match.id) ?? []);

      for (const participant of summary.participants) {
        if (participant.subjectSide !== match.teamSide || participant.goals <= 0) continue;

        const displayName = participant.displayName
          ?? (participant.shirtNumber !== null ? `#${participant.shirtNumber}` : "選手");
        const key = participant.subjectTeamMemberId
          ? `member:${participant.subjectTeamMemberId}`
          : `manual:${participant.shirtNumber ?? ""}:${displayName}`;
        const existing = scorerMap.get(key);

        if (existing) {
          existing.goals += participant.goals;
        } else {
          scorerMap.set(key, {
            teamMemberId: participant.subjectTeamMemberId,
            displayName,
            shirtNumber: participant.shirtNumber,
            goals: participant.goals,
          });
        }
      }
    }
    scorers = [...scorerMap.values()];
  }

  return buildDashboardSummary({
    now: new Date(),
    activeMemberCount,
    matches,
    recordMatches,
    currentSeasonName: currentSeason?.name ?? null,
    scorers,
  });
}
