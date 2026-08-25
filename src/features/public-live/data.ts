import { createPublicClient } from "@/lib/supabase/public-client";
import { shapePublicLiveMatch, shapePublicMatchSummaries } from "./data-shaping";
import type { PublicLiveMatch, PublicMatchSummary } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getPublicLiveMatch(matchId: string): Promise<PublicLiveMatch | null> {
  if (!UUID_PATTERN.test(matchId)) return null;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_live_match", {
    p_match_id: matchId,
  });

  if (error) return null;
  return shapePublicLiveMatch(data);
}

export async function getPublicTeamMatches(teamId: string): Promise<PublicMatchSummary[]> {
  if (!UUID_PATTERN.test(teamId)) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_team_matches", {
    p_team_id: teamId,
  });

  if (error) return [];
  return shapePublicMatchSummaries(data ?? []);
}
