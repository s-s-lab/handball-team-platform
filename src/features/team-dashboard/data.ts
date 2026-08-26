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
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("id, name, opponent_name, team_side, scheduled_at, venue, status")
    .eq("team_id", teamId)
    .order("scheduled_at", { ascending: true });

  if (matchError) throw databaseReadFailure();
  if (!matchRows?.length) {
    return buildDashboardSummary({
      now: new Date(),
      activeMemberCount,
      matches: [],
      scorers: [],
    });
  }

  const matchIds = matchRows.map((match) => match.id);
  const { data: stateRows, error: stateError } = await supabase
    .from("match_state")
    .select("match_id, home_score, away_score")
    .in("match_id", matchIds);

  if (stateError) throw databaseReadFailure();

  const scoreByMatch = new Map(
    (stateRows ?? []).map((state) => [
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

    for (const event of mapRecordEventRows(eventRows)) {
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

  return buildDashboardSummary({
    now: new Date(),
    activeMemberCount,
    matches,
    scorers: [...scorerMap.values()],
  });
}
