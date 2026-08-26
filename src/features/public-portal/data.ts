import "server-only";

import { createPublicClient } from "@/lib/supabase/public-client";
import {
  shapePublicPortalMatches,
  shapePublicTeamSearchResults,
} from "./data-shaping";
import type { PublicPortalMatch, PublicTeamSearchResult } from "./types";

export async function getPublicPortalMatches(): Promise<PublicPortalMatch[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_portal_matches");
  if (error) return [];
  return shapePublicPortalMatches(data ?? []);
}

export async function searchPublicTeams(query: string): Promise<PublicTeamSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_public_teams", {
    p_query: normalized,
  });
  if (error) return [];
  return shapePublicTeamSearchResults(data ?? []);
}
