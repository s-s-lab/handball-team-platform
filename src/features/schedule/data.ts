import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ScheduleEvent, TeamEventStatus, TeamEventType } from "./types";

function databaseReadFailure() {
  return new Error("スケジュールを読み込めませんでした。");
}

function mapEvent(row: {
  id: string;
  team_id: string;
  linked_match_id: string | null;
  event_type: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  memo: string | null;
  status: string;
}): ScheduleEvent {
  return {
    id: row.id,
    teamId: row.team_id,
    linkedMatchId: row.linked_match_id,
    eventType: row.event_type as TeamEventType,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venue: row.venue,
    memo: row.memo,
    status: row.status as TeamEventStatus,
  };
}

const SELECT = "id, team_id, linked_match_id, event_type, title, starts_at, ends_at, venue, memo, status";

export async function listTeamScheduleEvents(
  teamId: string,
  fromIso: string,
  toIso: string,
): Promise<ScheduleEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_events")
    .select(SELECT)
    .eq("team_id", teamId)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at", { ascending: true });

  if (error) throw databaseReadFailure();
  return (data ?? []).map(mapEvent);
}

export async function listUpcomingTeamEvents(
  teamId: string,
  nowIso: string,
  limit = 6,
): Promise<ScheduleEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_events")
    .select(SELECT)
    .eq("team_id", teamId)
    .neq("status", "cancelled")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) throw databaseReadFailure();
  return (data ?? []).map(mapEvent);
}

export async function getTeamScheduleEvent(
  teamId: string,
  eventId: string,
): Promise<ScheduleEvent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_events")
    .select(SELECT)
    .eq("team_id", teamId)
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw databaseReadFailure();
  return data ? mapEvent(data) : null;
}
