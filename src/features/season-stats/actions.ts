"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseMatchSeasonForm, parseSeasonForm, parseSeasonStatsForm } from "./validation";

function errorPath(teamId: string, message: string, seasonId?: string | null) {
  const params = new URLSearchParams({ error: message });
  if (seasonId) params.set("season", seasonId);
  return `/app/teams/${teamId}/stats?${params.toString()}`;
}

function successPath(teamId: string, message: string, seasonId?: string | null) {
  const params = new URLSearchParams({ success: message });
  if (seasonId) params.set("season", seasonId);
  return `/app/teams/${teamId}/stats?${params.toString()}`;
}

function seasonError(error: { code?: string | null }) {
  if (error.code === "42501" || error.code === "PGRST301") return "この成績を変更する権限がありません。";
  if (error.code === "23505") return "同じシーズン名があるか、現在シーズンの設定が競合しています。";
  if (error.code === "23514" || error.code === "22023") return "入力したシーズン・成績の内容を確認してください。";
  if (error.code === "P0002") return "対象のシーズン・試合が見つかりませんでした。";
  return "成績を更新できませんでした。時間をおいてもう一度お試しください。";
}

function revalidateTeamStats(teamId: string) {
  revalidatePath(`/app/teams/${teamId}`);
  revalidatePath(`/app/teams/${teamId}/stats`);
  revalidatePath(`/app/teams/${teamId}/matches`);
  revalidatePath(`/app/teams/${teamId}/members`);
}

export async function saveSeasonAction(formData: FormData) {
  const parsed = parseSeasonForm(formData);
  const rawTeamId = typeof formData.get("teamId") === "string" ? String(formData.get("teamId")) : "";
  if (!parsed.ok) redirect(errorPath(rawTeamId, parsed.message));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_season", {
    p_team_id: parsed.value.teamId,
    p_season_id: parsed.value.seasonId,
    p_name: parsed.value.name,
    p_start_date: parsed.value.startDate,
    p_end_date: parsed.value.endDate,
    p_is_current: parsed.value.isCurrent,
  });

  if (error) redirect(errorPath(parsed.value.teamId, seasonError(error), parsed.value.seasonId));
  revalidateTeamStats(parsed.value.teamId);
  redirect(successPath(parsed.value.teamId, parsed.value.seasonId ? "シーズン情報を更新しました。" : "シーズンを作成しました。", typeof data === "string" ? data : parsed.value.seasonId));
}

export async function assignMatchSeasonAction(formData: FormData) {
  const parsed = parseMatchSeasonForm(formData);
  const rawTeamId = typeof formData.get("teamId") === "string" ? String(formData.get("teamId")) : "";
  if (!parsed.ok) redirect(errorPath(rawTeamId, parsed.message));

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_match_season", {
    p_team_id: parsed.value.teamId,
    p_match_id: parsed.value.matchId,
    p_season_id: parsed.value.seasonId,
  });

  if (error) redirect(errorPath(parsed.value.teamId, seasonError(error), parsed.value.seasonId));
  revalidateTeamStats(parsed.value.teamId);
  redirect(successPath(parsed.value.teamId, "試合のシーズンを更新しました。", parsed.value.seasonId));
}

export async function saveSeasonPlayerStatsAction(formData: FormData) {
  const parsed = parseSeasonStatsForm(formData);
  const rawTeamId = typeof formData.get("teamId") === "string" ? String(formData.get("teamId")) : "";
  const rawSeasonId = typeof formData.get("seasonId") === "string" ? String(formData.get("seasonId")) : null;
  if (!parsed.ok) redirect(errorPath(rawTeamId, parsed.message, rawSeasonId));

  const rows = parsed.value.rows.map((row) => ({
    team_member_id: row.teamMemberId,
    appearances: row.appearances,
    starts: row.starts,
    goals: row.goals,
    seven_meter_goals: row.sevenMeterGoals,
    seven_meter_attempts: row.sevenMeterAttempts,
    warnings: row.warnings,
    two_minute_suspensions: row.twoMinuteSuspensions,
    disqualifications: row.disqualifications,
    saves: row.saves,
    shots_faced: row.shotsFaced,
    notes: row.notes,
  }));

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_season_player_stats", {
    p_team_id: parsed.value.teamId,
    p_season_id: parsed.value.seasonId,
    p_rows: rows,
  });

  if (error) redirect(errorPath(parsed.value.teamId, seasonError(error), parsed.value.seasonId));
  revalidateTeamStats(parsed.value.teamId);
  redirect(successPath(parsed.value.teamId, "選手成績を保存しました。", parsed.value.seasonId));
}
