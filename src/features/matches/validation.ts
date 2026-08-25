import type { ParseResult } from "@/features/team-core/types";
import {
  MATCH_SIDES,
  type MatchInput,
  type MatchRosterInput,
  type MatchRulesInput,
  type TeamSide,
} from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value ? value : null;
}

function invalid<T>(message: string): ParseResult<T> {
  return { ok: false, message };
}

function integerInRange(
  formData: FormData,
  key: string,
  min: number,
  max: number,
  label: string,
): ParseResult<number> {
  const raw = text(formData, key);
  if (!/^\d+$/.test(raw)) return invalid(`${label}は整数で入力してください。`);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return invalid(`${label}は${min}〜${max}で入力してください。`);
  }
  return { ok: true, value };
}

export function japanLocalDateTimeToIso(value: string): string | null {
  const match = LOCAL_DATETIME_RE.exec(value);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (month < 1 || month > 12 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;

  const timestamp = Date.parse(`${value}:00+09:00`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function parseMatchForm(formData: FormData): ParseResult<MatchInput> {
  const teamId = text(formData, "teamId");
  if (!UUID_RE.test(teamId)) return invalid("チーム情報が正しくありません。");

  const name = text(formData, "name");
  if (!name) return invalid("試合名を入力してください。");
  if (name.length > 100) return invalid("試合名は100文字以内で入力してください。");

  const opponentName = text(formData, "opponentName");
  if (!opponentName) return invalid("対戦相手を入力してください。");
  if (opponentName.length > 100) return invalid("対戦相手は100文字以内で入力してください。");

  const rawSide = text(formData, "teamSide");
  if (!MATCH_SIDES.includes(rawSide as TeamSide)) {
    return invalid("HOMEまたはAWAYを選択してください。");
  }

  const scheduledAt = japanLocalDateTimeToIso(text(formData, "scheduledAt"));
  if (!scheduledAt) return invalid("試合日時を正しく入力してください。");

  const venue = text(formData, "venue");
  if (venue.length > 120) return invalid("会場は120文字以内で入力してください。");

  const memo = text(formData, "memo");
  if (memo.length > 2000) return invalid("メモは2000文字以内で入力してください。");

  const periodCount = integerInRange(formData, "periodCount", 1, 4, "ピリオド数");
  if (!periodCount.ok) return periodCount;
  const periodMinutes = integerInRange(formData, "periodMinutes", 1, 60, "1ピリオドの時間");
  if (!periodMinutes.ok) return periodMinutes;
  const halftimeMinutes = integerInRange(formData, "halftimeMinutes", 0, 30, "ハーフタイム");
  if (!halftimeMinutes.ok) return halftimeMinutes;
  const overtimePeriodCount = integerInRange(formData, "overtimePeriodCount", 1, 4, "延長ピリオド数");
  if (!overtimePeriodCount.ok) return overtimePeriodCount;
  const overtimePeriodMinutes = integerInRange(formData, "overtimePeriodMinutes", 1, 30, "延長1ピリオドの時間");
  if (!overtimePeriodMinutes.ok) return overtimePeriodMinutes;
  const teamTimeoutsPerGame = integerInRange(formData, "teamTimeoutsPerGame", 0, 3, "チームタイムアウト数");
  if (!teamTimeoutsPerGame.ok) return teamTimeoutsPerGame;
  const teamTimeoutsPerPeriod = integerInRange(formData, "teamTimeoutsPerPeriod", 0, 2, "1ピリオドのチームタイムアウト数");
  if (!teamTimeoutsPerPeriod.ok) return teamTimeoutsPerPeriod;
  const teamTimeoutSeconds = integerInRange(formData, "teamTimeoutSeconds", 30, 120, "チームタイムアウト時間");
  if (!teamTimeoutSeconds.ok) return teamTimeoutSeconds;

  const rules: MatchRulesInput = {
    periodCount: periodCount.value,
    periodSeconds: periodMinutes.value * 60,
    halftimeSeconds: halftimeMinutes.value * 60,
    overtimeEnabled: formData.get("overtimeEnabled") === "on",
    overtimePeriodCount: overtimePeriodCount.value,
    overtimePeriodSeconds: overtimePeriodMinutes.value * 60,
    teamTimeoutsPerGame: teamTimeoutsPerGame.value,
    teamTimeoutsPerPeriod: teamTimeoutsPerPeriod.value,
    teamTimeoutSeconds: teamTimeoutSeconds.value,
  };

  return {
    ok: true,
    value: {
      teamId,
      name,
      opponentName,
      teamSide: rawSide as TeamSide,
      scheduledAt,
      venue: optionalText(venue),
      memo: optionalText(memo),
      isPublic: formData.get("isPublic") === "on",
      rules,
    },
  };
}

export function parseRosterForm(formData: FormData): ParseResult<MatchRosterInput> {
  const matchId = text(formData, "matchId");
  if (!UUID_RE.test(matchId)) return invalid("試合情報が正しくありません。");

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of formData.getAll("teamMemberId")) {
    if (typeof value !== "string" || !UUID_RE.test(value)) {
      return invalid("ロスター情報が正しくありません。");
    }
    if (!seen.has(value)) {
      seen.add(value);
      ids.push(value);
    }
  }

  return { ok: true, value: { matchId, teamMemberIds: ids } };
}
