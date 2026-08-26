import type { ParseResult } from "@/features/team-core/types";
import {
  CONSOLE_ACTIONS,
  type ConsoleActionInput,
  type ConsoleActionName,
  type ConsoleActionPayload,
} from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARTICIPANT_ACTIONS = new Set<ConsoleActionName>([
  "warning",
  "suspension",
  "disqualification",
]);
const SIDED_ACTIONS = new Set<ConsoleActionName>([
  "goal",
  "seven_meter_missed",
  "warning",
  "suspension",
  "disqualification",
  "team_timeout",
]);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string): ParseResult<ConsoleActionInput> {
  return { ok: false, message };
}

function addSide(formData: FormData, payload: ConsoleActionPayload) {
  const side = text(formData, "side");
  if (side !== "home" && side !== "away") return false;
  payload.side = side;
  return true;
}

function addParticipantFields(
  formData: FormData,
  payload: ConsoleActionPayload,
): ParseResult<ConsoleActionPayload> {
  const rosterId = text(formData, "subjectMatchRosterId");
  if (rosterId) {
    if (!UUID_PATTERN.test(rosterId)) return { ok: false, message: "対象選手が正しくありません。" };
    payload.subject_match_roster_id = rosterId;
  }

  const rawShirtNumber = text(formData, "shirtNumber");
  if (rawShirtNumber) {
    if (!/^\d{1,2}$/.test(rawShirtNumber)) return { ok: false, message: "背番号が正しくありません。" };
    const shirtNumber = Number(rawShirtNumber);
    if (!Number.isSafeInteger(shirtNumber) || shirtNumber < 0 || shirtNumber > 99) {
      return { ok: false, message: "背番号が正しくありません。" };
    }
    payload.shirt_number = shirtNumber;
  }

  const displayName = text(formData, "displayName");
  if (displayName) {
    if (displayName.length > 100) return { ok: false, message: "表示名は100文字以内で入力してください。" };
    payload.display_name = displayName;
  }

  const subjectKind = text(formData, "subjectKind");
  if (subjectKind) {
    if (subjectKind !== "player" && subjectKind !== "staff") {
      return { ok: false, message: "対象区分が正しくありません。" };
    }
    payload.subject_kind = subjectKind;
  }

  return { ok: true, value: payload };
}

function hasParticipant(payload: ConsoleActionPayload) {
  return (
    typeof payload.subject_match_roster_id === "string" ||
    typeof payload.shirt_number === "number" ||
    typeof payload.display_name === "string"
  );
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
  const payload: ConsoleActionPayload = {};

  if (SIDED_ACTIONS.has(action) && !addSide(formData, payload)) {
    return fail("対象チームが正しくありません。");
  }

  if (["goal", "seven_meter_missed", "warning", "suspension", "disqualification"].includes(action)) {
    const participant = addParticipantFields(formData, payload);
    if (!participant.ok) return fail(participant.message);
  }

  if (action === "goal") {
    const legacyScorer = text(formData, "scorerTeamMemberId");
    if (legacyScorer) {
      if (!UUID_PATTERN.test(legacyScorer)) return fail("得点者が正しくありません。");
      if (typeof payload.subject_match_roster_id === "string") {
        return fail("得点者の指定方法が重複しています。");
      }
      payload.scorer_team_member_id = legacyScorer;
    }

    const goalMethod = text(formData, "goalMethod");
    if (goalMethod) {
      if (goalMethod !== "open_play" && goalMethod !== "seven_meter") {
        return fail("得点方法が正しくありません。");
      }
      payload.goal_method = goalMethod;
    }
  }

  if (PARTICIPANT_ACTIONS.has(action) && !hasParticipant(payload)) {
    return fail("対象選手またはスタッフを指定してください。");
  }

  if (action === "disqualification" && formData.get("reportRequired") === "on") {
    payload.report_required = true;
  }

  if (action === "revert_event") {
    const targetEventId = text(formData, "targetEventId");
    if (!UUID_PATTERN.test(targetEventId)) return fail("訂正対象の記録が正しくありません。");
    payload.target_event_id = targetEventId;

    const reason = text(formData, "reason");
    if (reason) {
      if (reason.length > 200) return fail("訂正理由は200文字以内で入力してください。");
      payload.reason = reason;
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
