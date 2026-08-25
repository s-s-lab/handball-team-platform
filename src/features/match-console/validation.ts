import type { ParseResult } from "@/features/team-core/types";
import { CONSOLE_ACTIONS, type ConsoleActionInput, type ConsoleActionName } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string): ParseResult<ConsoleActionInput> {
  return { ok: false, message };
}

export function parseConsoleAction(formData: FormData): ParseResult<ConsoleActionInput> {
  const matchId = text(formData, "matchId");
  const clientActionId = text(formData, "clientActionId");
  const rawVersion = text(formData, "expectedVersion");
  const rawAction = text(formData, "action");

  if (!UUID_PATTERN.test(matchId)) return fail("試合IDが正しくありません。");
  if (!UUID_PATTERN.test(clientActionId)) return fail("操作IDが正しくありません。");
  if (!/^\d+$/.test(rawVersion)) return fail("試合状態のバージョンが正しくありません。");

  const expectedVersion = Number(rawVersion);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return fail("試合状態のバージョンが正しくありません。");
  }

  if (!CONSOLE_ACTIONS.includes(rawAction as ConsoleActionName)) {
    return fail("この操作はサポートされていません。");
  }

  const action = rawAction as ConsoleActionName;
  const payload: Record<string, string | number> = {};

  if (action === "goal") {
    const side = text(formData, "side");
    if (side !== "home" && side !== "away") return fail("得点側が正しくありません。");
    payload.side = side;

    const scorer = text(formData, "scorerTeamMemberId");
    if (scorer) {
      if (!UUID_PATTERN.test(scorer)) return fail("得点者が正しくありません。");
      payload.scorer_team_member_id = scorer;
    }
  }

  if (action === "set_period") {
    const rawPeriod = text(formData, "period");
    if (!/^\d+$/.test(rawPeriod)) return fail("ピリオドが正しくありません。");
    const period = Number(rawPeriod);
    if (!Number.isSafeInteger(period) || period < 1) return fail("ピリオドが正しくありません。");
    payload.period = period;
  }

  return {
    ok: true,
    value: { matchId, clientActionId, expectedVersion, action, payload },
  };
}
