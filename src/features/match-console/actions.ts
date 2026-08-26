"use server";

import { createClient } from "@/lib/supabase/server";
import { mapConsoleSnapshot } from "./data";
import type { ConsoleActionResult } from "./types";
import { parseConsoleAction } from "./validation";

async function latestSnapshot(matchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_console_snapshot", {
    p_match_id: matchId,
  });
  if (error) return undefined;
  return mapConsoleSnapshot(data) ?? undefined;
}

export async function applyConsoleAction(formData: FormData): Promise<ConsoleActionResult> {
  const parsed = parseConsoleAction(formData);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_match_action", {
    p_match_id: parsed.value.matchId,
    p_client_action_id: parsed.value.clientActionId,
    p_expected_version: parsed.value.expectedVersion,
    p_action: parsed.value.action,
    p_payload: parsed.value.payload,
  });

  if (error) {
    if (error.code === "40001") {
      return {
        ok: false,
        message: "別の端末で試合状態が更新されました。最新状態を読み込みました。",
        snapshot: await latestSnapshot(parsed.value.matchId),
      };
    }

    if (error.code === "42501") {
      return { ok: false, message: "この試合を操作する権限がありません。" };
    }

    if (error.code === "22023") {
      return {
        ok: false,
        message: "この操作は現在の試合状態では実行できません。最新状態を確認してください。",
        snapshot: await latestSnapshot(parsed.value.matchId),
      };
    }

    return {
      ok: false,
      message: "試合状態を更新できませんでした。通信状態を確認してもう一度お試しください。",
    };
  }

  const snapshot = mapConsoleSnapshot(data);
  if (!snapshot) {
    return { ok: false, message: "更新後の試合状態を読み込めませんでした。" };
  }

  return { ok: true, snapshot };
}
