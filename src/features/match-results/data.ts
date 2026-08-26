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
    .select("id, team_id, name, competition_name, opponent_name, team_side, scheduled_at, venue, status, is_public, completed_at, result_source")
    .eq("team_id", teamId)
    .order("scheduled_at", { ascending: true });

  if (matchError) throw databaseReadFailure();
  if (!matches?.length) return [];

  const { data: states, error: stateError } = await supabase
    .from("match_state")
    .select("match_id, home_score, away_score")
    .in("match_id", matches.map((match) => match.id));

  if (stateError) throw databaseReadFailure();
  return mapTeamMatchResultRows(matches, states ?? []);
}
