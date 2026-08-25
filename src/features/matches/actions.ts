"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMatchForm, parseRosterForm } from "./validation";

function errorPath(path: string, message: string) {
  const params = new URLSearchParams({ error: message });
  return `${path}?${params.toString()}`;
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function matchErrorMessage(error: { code?: string | null }) {
  if (error.code === "42501") return "この試合を操作する権限がありません。";
  if (error.code === "22023") return "ロスターにこのチーム以外のメンバーが含まれています。";
  if (error.code === "P0002") return "試合情報が見つかりませんでした。";
  return "処理を完了できませんでした。時間をおいてもう一度お試しください。";
}

export async function createMatch(formData: FormData) {
  const parsed = parseMatchForm(formData);
  const fallbackTeamId = formText(formData, "teamId");
  const path = `/app/teams/${fallbackTeamId}/matches/new`;

  if (!parsed.ok) redirect(errorPath(path, parsed.message));

  const { rules } = parsed.value;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_match_with_rules", {
    p_team_id: parsed.value.teamId,
    p_name: parsed.value.name,
    p_opponent_name: parsed.value.opponentName,
    p_team_side: parsed.value.teamSide,
    p_scheduled_at: parsed.value.scheduledAt,
    p_venue: parsed.value.venue ?? "",
    p_memo: parsed.value.memo ?? "",
    p_is_public: parsed.value.isPublic,
    p_period_count: rules.periodCount,
    p_period_seconds: rules.periodSeconds,
    p_halftime_seconds: rules.halftimeSeconds,
    p_overtime_enabled: rules.overtimeEnabled,
    p_overtime_period_count: rules.overtimePeriodCount,
    p_overtime_period_seconds: rules.overtimePeriodSeconds,
    p_team_timeouts_per_game: rules.teamTimeoutsPerGame,
    p_team_timeouts_per_period: rules.teamTimeoutsPerPeriod,
    p_team_timeout_seconds: rules.teamTimeoutSeconds,
  });

  if (error || typeof data !== "string") {
    redirect(errorPath(path, matchErrorMessage(error ?? {})));
  }

  revalidatePath("/app");
  revalidatePath(`/app/teams/${parsed.value.teamId}`);
  redirect(`/app/matches/${data}/roster`);
}

export async function saveMatchRoster(formData: FormData) {
  const parsed = parseRosterForm(formData);
  const fallbackMatchId = formText(formData, "matchId");
  const path = `/app/matches/${fallbackMatchId}/roster`;

  if (!parsed.ok) redirect(errorPath(path, parsed.message));

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_match_roster", {
    p_match_id: parsed.value.matchId,
    p_team_member_ids: parsed.value.teamMemberIds,
  });

  if (error) redirect(errorPath(path, matchErrorMessage(error)));

  revalidatePath(`/app/matches/${parsed.value.matchId}`);
  revalidatePath(`/app/matches/${parsed.value.matchId}/roster`);
  redirect(`/app/matches/${parsed.value.matchId}`);
}
