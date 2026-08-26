import "server-only";

import { createClient } from "@/lib/supabase/server";
import { deriveMatchRecordSummary } from "./runtime";
import { mapRecordEventRows } from "./data-shaping";
import type { MatchRecordSummary, RecordEvent } from "./types";

export async function listMatchRecordEvents(matchId: string): Promise<RecordEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_record_events", {
    p_match_id: matchId,
  });

  if (error) {
    if (error.code === "42501") return [];
    throw new Error("試合記録を読み込めませんでした。");
  }

  return mapRecordEventRows(data);
}

export async function getMatchRecordSummary(matchId: string): Promise<MatchRecordSummary> {
  const events = await listMatchRecordEvents(matchId);
  return deriveMatchRecordSummary(events);
}
