"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseManualMatchResultForm } from "./validation";

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function errorPath(teamId: string, message: string) {
  const params = new URLSearchParams({ error: message });
  return `/app/teams/${teamId}/matches/history/new?${params.toString()}`;
}

function manualResultErrorMessage(error: { code?: string | null }) {
  if (error.code === "42501") return "過去の試合結果を登録する権限がありません。";
  if (error.code === "22023") return "得点は0〜199の範囲で入力してください。";
  return "試合結果を登録できませんでした。時間をおいてもう一度お試しください。";
}

export async function createManualMatchResult(formData: FormData) {
  const fallbackTeamId = formText(formData, "teamId");
  const parsed = parseManualMatchResultForm(formData);

  if (!parsed.ok) redirect(errorPath(fallbackTeamId, parsed.message));

  const input = parsed.value;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_manual_match_result", {
    p_team_id: input.teamId,
    p_name: input.name,
    p_competition_name: input.competitionName ?? "",
    p_opponent_name: input.opponentName,
    p_team_side: input.teamSide,
    p_scheduled_at: input.scheduledAt,
    p_venue: input.venue ?? "",
    p_memo: input.memo ?? "",
    p_is_public: input.isPublic,
    p_team_score: input.teamScore,
    p_opponent_score: input.opponentScore,
  });

  if (error || typeof data !== "string") {
    redirect(errorPath(input.teamId, manualResultErrorMessage(error ?? {})));
  }

  revalidatePath("/app");
  revalidatePath(`/app/teams/${input.teamId}`);
  revalidatePath(`/app/teams/${input.teamId}/matches`);
  revalidatePath(`/app/teams/${input.teamId}/schedule`);
  revalidatePath(`/app/matches/${data}`);
  redirect(`/app/matches/${data}`);
}
