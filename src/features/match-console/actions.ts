"use server";

import { listMatchRecordEvents } from "@/features/match-records/data";
import type { RecordEvent } from "@/features/match-records/types";
import { createClient } from "@/lib/supabase/server";
import { mapConsoleSnapshot } from "./data";
import { mapConsoleActionDatabaseError } from "./errors";
import type { ConsoleActionResult } from "./types";
import { parseConsoleAction } from "./validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function latestSnapshot(matchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_console_snapshot", {
    p_match_id: matchId,
  });
  if (error) return undefined;
  return mapConsoleSnapshot(data) ?? undefined;
}

export async function refreshConsoleRecordEvents(matchId: string): Promise<RecordEvent[]> {
  if (!UUID_PATTERN.test(matchId)) return [];
  return listMatchRecordEvents(matchId);
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

    const message = mapConsoleActionDatabaseError(error.code, error.message);
    if (error.code === "22023") {
      return {
        ok: false,
        message,
        snapshot: await latestSnapshot(parsed.value.matchId),
      };
    }

    return { ok: false, message };
  }

  const snapshot = mapConsoleSnapshot(data);
  if (!snapshot) {
    return { ok: false, message: "更新後の試合状態を読み込めませんでした。" };
  }

  return { ok: true, snapshot };
}
