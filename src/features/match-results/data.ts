import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mapTeamMatchResultRows } from "./data-shaping";
import type { TeamMatchResultItem } from "./types";

function databaseReadFailure() {
  return new Error("試合結果を読み込めませんでした。");
}

export async function listTeamMatchResults(teamId: string): Promise<TeamMatchResultItem[]> {
  const supabase = await createClient();
  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("id, team_id, name, competition_name, opponent_name, team_side, scheduled_at, venue, status, is_public, completed_at, result_source, season_id")
    .eq("team_id", teamId)
    .order("scheduled_at", { ascending: true });

  if (matchError) throw databaseReadFailure();
  if (!matches?.length) return [];

  const seasonIds = [...new Set(matches.map((match) => match.season_id).filter((value): value is string => typeof value === "string"))];
  const [stateResult, seasonResult] = await Promise.all([
    supabase
      .from("match_state")
      .select("match_id, home_score, away_score")
      .in("match_id", matches.map((match) => match.id)),
    seasonIds.length > 0
      ? supabase
          .from("seasons")
          .select("id, name")
          .eq("team_id", teamId)
          .in("id", seasonIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (stateResult.error || seasonResult.error) throw databaseReadFailure();
  return mapTeamMatchResultRows(matches, stateResult.data ?? [], seasonResult.data ?? []);
}
