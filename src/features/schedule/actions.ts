"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid, parseScheduleForm } from "./validation";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function errorPath(path: string, message: string) {
  return `${path}?${new URLSearchParams({ error: message }).toString()}`;
}

function scheduleError(error: { code?: string | null }) {
  if (error.code === "42501" || error.code === "PGRST301") return "この予定を変更する権限がありません。";
  if (error.code === "23514") return "開始・終了日時などの入力内容を確認してください。";
  return "スケジュールを更新できませんでした。時間をおいてもう一度お試しください。";
}

function revalidateTeam(teamId: string) {
  revalidatePath(`/app/teams/${teamId}`);
  revalidatePath(`/app/teams/${teamId}/schedule`);
}

export async function createScheduleEvent(formData: FormData) {
  const teamId = text(formData, "teamId");
  const path = `/app/teams/${teamId}/schedule/new`;
  const parsed = parseScheduleForm(formData);
  if (!parsed.ok) redirect(errorPath(path, parsed.message));

  const supabase = await createClient();
  const { error } = await supabase.from("team_events").insert({
    team_id: parsed.value.teamId,
    event_type: parsed.value.eventType,
    title: parsed.value.title,
    starts_at: parsed.value.startsAt,
    ends_at: parsed.value.endsAt,
    venue: parsed.value.venue,
    memo: parsed.value.memo,
    status: parsed.value.status,
  });

  if (error) redirect(errorPath(path, scheduleError(error)));
  revalidateTeam(parsed.value.teamId);
  redirect(`/app/teams/${parsed.value.teamId}/schedule`);
}

async function ensureManualEvent(teamId: string, eventId: string, path: string) {
  if (!isUuid(eventId)) redirect(errorPath(path, "予定情報が正しくありません。"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_events")
    .select("linked_match_id")
    .eq("team_id", teamId)
    .eq("id", eventId)
    .maybeSingle();

  if (error) redirect(errorPath(path, scheduleError(error)));
  if (!data) redirect(errorPath(path, "予定が見つかりませんでした。"));
  if (data.linked_match_id) {
    redirect(errorPath(path, "試合に連動した予定は、試合情報から変更してください。"));
  }
  return supabase;
}

export async function updateScheduleEvent(formData: FormData) {
  const teamId = text(formData, "teamId");
  const eventId = text(formData, "eventId");
  const path = `/app/teams/${teamId}/schedule/${eventId}/edit`;
  const parsed = parseScheduleForm(formData);
  if (!parsed.ok) redirect(errorPath(path, parsed.message));

  const supabase = await ensureManualEvent(teamId, eventId, path);
  const { error } = await supabase
    .from("team_events")
    .update({
      event_type: parsed.value.eventType,
      title: parsed.value.title,
      starts_at: parsed.value.startsAt,
      ends_at: parsed.value.endsAt,
      venue: parsed.value.venue,
      memo: parsed.value.memo,
      status: parsed.value.status,
    })
    .eq("team_id", parsed.value.teamId)
    .eq("id", eventId);

  if (error) redirect(errorPath(path, scheduleError(error)));
  revalidateTeam(parsed.value.teamId);
  redirect(`/app/teams/${parsed.value.teamId}/schedule`);
}

export async function deleteScheduleEvent(formData: FormData) {
  const teamId = text(formData, "teamId");
  const eventId = text(formData, "eventId");
  const path = `/app/teams/${teamId}/schedule/${eventId}/edit`;
  const supabase = await ensureManualEvent(teamId, eventId, path);
  const { error } = await supabase
    .from("team_events")
    .delete()
    .eq("team_id", teamId)
    .eq("id", eventId);

  if (error) redirect(errorPath(path, scheduleError(error)));
  revalidateTeam(teamId);
  redirect(`/app/teams/${teamId}/schedule`);
}
