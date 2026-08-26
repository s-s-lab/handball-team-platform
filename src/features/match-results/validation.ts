import type { ParseResult } from "@/features/team-core/types";
import { japanLocalDateTimeToIso } from "@/features/matches/validation";
import { MATCH_SIDES, type TeamSide } from "@/features/matches/types";
import type { ManualMatchResultInput } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function parseManualMatchResultForm(
  formData: FormData,
): ParseResult<ManualMatchResultInput> {
  const teamId = text(formData, "teamId");
  if (!UUID_RE.test(teamId)) return invalid("チーム情報が正しくありません。");

  const name = text(formData, "name");
  if (!name) return invalid("試合名を入力してください。");
  if (name.length > 100) return invalid("試合名は100文字以内で入力してください。");

  const competitionName = text(formData, "competitionName");
  if (competitionName.length > 120) {
    return invalid("大会・リーグ名は120文字以内で入力してください。");
  }

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

  const teamScore = integerInRange(formData, "teamScore", 0, 199, "自チーム得点");
  if (!teamScore.ok) return teamScore;

  const opponentScore = integerInRange(formData, "opponentScore", 0, 199, "相手得点");
  if (!opponentScore.ok) return opponentScore;

  return {
    ok: true,
    value: {
      teamId,
      name,
      competitionName: optionalText(competitionName),
      opponentName,
      teamSide: rawSide as TeamSide,
      scheduledAt,
      venue: optionalText(venue),
      memo: optionalText(memo),
      isPublic: formData.get("isPublic") === "on",
      teamScore: teamScore.value,
      opponentScore: opponentScore.value,
    },
  };
}
