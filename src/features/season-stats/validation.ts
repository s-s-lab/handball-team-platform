type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

export type SeasonFormInput = {
  teamId: string;
  seasonId: string | null;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type MatchSeasonFormInput = {
  teamId: string;
  matchId: string;
  seasonId: string | null;
};

export type SeasonStatsRowInput = {
  teamMemberId: string;
  appearances: number;
  starts: number;
  goals: number;
  sevenMeterGoals: number;
  sevenMeterAttempts: number;
  warnings: number;
  twoMinuteSuspensions: number;
  disqualifications: number;
  saves: number;
  shotsFaced: number;
  notes: string | null;
};

export type SeasonStatsFormInput = {
  teamId: string;
  seasonId: string;
  rows: SeasonStatsRowInput[];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function uuid(value: string) {
  return uuidPattern.test(value);
}

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function integer(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 9999 ? parsed : null;
}

export function parseSeasonForm(formData: FormData): ValidationResult<SeasonFormInput> {
  const teamId = text(formData, "teamId");
  const rawSeasonId = text(formData, "seasonId");
  const name = text(formData, "name");
  const startDate = text(formData, "startDate");
  const endDate = text(formData, "endDate");

  if (!uuid(teamId)) return { ok: false, message: "チーム情報が正しくありません。" };
  if (rawSeasonId && !uuid(rawSeasonId)) return { ok: false, message: "シーズン情報が正しくありません。" };
  if (!name || name.length > 80) return { ok: false, message: "シーズン名を80文字以内で入力してください。" };
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
    return { ok: false, message: "シーズン期間を正しく入力してください。" };
  }

  return {
    ok: true,
    value: {
      teamId,
      seasonId: rawSeasonId || null,
      name,
      startDate,
      endDate,
      isCurrent: text(formData, "isCurrent") === "true",
    },
  };
}

export function parseMatchSeasonForm(formData: FormData): ValidationResult<MatchSeasonFormInput> {
  const teamId = text(formData, "teamId");
  const matchId = text(formData, "matchId");
  const rawSeasonId = text(formData, `seasonId:${matchId}`);

  if (!uuid(teamId) || !uuid(matchId)) return { ok: false, message: "試合情報が正しくありません。" };
  if (rawSeasonId && !uuid(rawSeasonId)) return { ok: false, message: "シーズン情報が正しくありません。" };

  return { ok: true, value: { teamId, matchId, seasonId: rawSeasonId || null } };
}

export function parseSeasonStatsForm(formData: FormData): ValidationResult<SeasonStatsFormInput> {
  const teamId = text(formData, "teamId");
  const seasonId = text(formData, "seasonId");
  const memberIds = formData.getAll("memberId").filter((value): value is string => typeof value === "string");

  if (!uuid(teamId) || !uuid(seasonId)) return { ok: false, message: "シーズン情報が正しくありません。" };
  if (memberIds.some((memberId) => !uuid(memberId))) return { ok: false, message: "選手情報が正しくありません。" };

  const rows: SeasonStatsRowInput[] = [];
  for (const teamMemberId of memberIds) {
    const fields = {
      appearances: integer(formData, `appearances:${teamMemberId}`),
      starts: integer(formData, `starts:${teamMemberId}`),
      goals: integer(formData, `goals:${teamMemberId}`),
      sevenMeterGoals: integer(formData, `sevenMeterGoals:${teamMemberId}`),
      sevenMeterAttempts: integer(formData, `sevenMeterAttempts:${teamMemberId}`),
      warnings: integer(formData, `warnings:${teamMemberId}`),
      twoMinuteSuspensions: integer(formData, `twoMinuteSuspensions:${teamMemberId}`),
      disqualifications: integer(formData, `disqualifications:${teamMemberId}`),
      saves: integer(formData, `saves:${teamMemberId}`),
      shotsFaced: integer(formData, `shotsFaced:${teamMemberId}`),
    };

    if (Object.values(fields).some((value) => value === null)) {
      return { ok: false, message: "成績は0以上の整数で入力してください。" };
    }

    const appearances = fields.appearances as number;
    const starts = fields.starts as number;
    const sevenMeterGoals = fields.sevenMeterGoals as number;
    const sevenMeterAttempts = fields.sevenMeterAttempts as number;
    const saves = fields.saves as number;
    const shotsFaced = fields.shotsFaced as number;

    if (starts > appearances) return { ok: false, message: "先発数は出場数以下にしてください。" };
    if (sevenMeterGoals > sevenMeterAttempts) return { ok: false, message: "7m得点は7m試投以下にしてください。" };
    if (saves > shotsFaced) return { ok: false, message: "セーブ数は被シュート数以下にしてください。" };

    const notes = text(formData, `notes:${teamMemberId}`);
    if (notes.length > 2000) return { ok: false, message: "メモは2000文字以内で入力してください。" };

    rows.push({
      teamMemberId,
      appearances,
      starts,
      goals: fields.goals as number,
      sevenMeterGoals,
      sevenMeterAttempts,
      warnings: fields.warnings as number,
      twoMinuteSuspensions: fields.twoMinuteSuspensions as number,
      disqualifications: fields.disqualifications as number,
      saves,
      shotsFaced,
      notes: notes || null,
    });
  }

  return { ok: true, value: { teamId, seasonId, rows } };
}
