import {
  HANDBALL_POSITIONS,
  MEMBER_KINDS,
  type HandballPosition,
  type OrganizationInput,
  type ParseResult,
  type TeamInput,
  type TeamMemberInput,
  type TeamMemberKind,
} from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string) {
  return value.length > 0 ? value : null;
}

function invalid<T>(message: string): ParseResult<T> {
  return { ok: false, message };
}

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateName(value: string, label: string): ParseResult<string> {
  if (!value) return invalid(`${label}を入力してください。`);
  if (value.length > 80) return invalid(`${label}は80文字以内で入力してください。`);
  return { ok: true, value };
}

function validateSlug(value: string): ParseResult<string> {
  const normalized = value.toLowerCase();
  if (normalized.length < 2 || normalized.length > 60 || !SLUG_RE.test(normalized)) {
    return invalid("スラッグは2〜60文字の半角英小文字・数字・ハイフンで入力してください。");
  }
  return { ok: true, value: normalized };
}

export function parseOrganizationForm(formData: FormData): ParseResult<OrganizationInput> {
  const name = text(formData, "name");
  const slug = text(formData, "slug");
  const validName = validateName(name, "組織名");
  if (!validName.ok) return validName;
  const validSlug = validateSlug(slug);
  if (!validSlug.ok) return validSlug;
  return { ok: true, value: { name: validName.value, slug: validSlug.value } };
}

export function parseTeamForm(formData: FormData): ParseResult<TeamInput> {
  const organizationId = text(formData, "organizationId");
  if (!UUID_RE.test(organizationId)) return invalid("組織情報が正しくありません。");

  const name = text(formData, "name");
  const slug = text(formData, "slug");
  const validName = validateName(name, "チーム名");
  if (!validName.ok) return validName;
  const validSlug = validateSlug(slug);
  if (!validSlug.ok) return validSlug;

  return {
    ok: true,
    value: { organizationId, name: validName.value, slug: validSlug.value },
  };
}

export function parseTeamMemberForm(formData: FormData): ParseResult<TeamMemberInput> {
  const teamId = text(formData, "teamId");
  if (!UUID_RE.test(teamId)) return invalid("チーム情報が正しくありません。");

  const rawKind = text(formData, "kind");
  if (!MEMBER_KINDS.includes(rawKind as TeamMemberKind)) {
    return invalid("選手またはスタッフを選択してください。");
  }

  const fullName = text(formData, "fullName");
  if (!fullName) return invalid("氏名を入力してください。");
  if (fullName.length > 100) return invalid("氏名は100文字以内で入力してください。");

  const displayNameRaw = text(formData, "displayName");
  if (displayNameRaw.length > 100) return invalid("表示名は100文字以内で入力してください。");

  const isPublic = formData.get("isPublic") === "on";
  if (isPublic && !displayNameRaw) {
    return invalid("公開する場合は公開表示名を入力してください。");
  }

  const gradeOrAgeRaw = text(formData, "gradeOrAge");
  if (gradeOrAgeRaw.length > 40) return invalid("学年・年齢は40文字以内で入力してください。");

  const shirtNumberRaw = text(formData, "shirtNumber");
  let shirtNumber: number | null = null;
  if (shirtNumberRaw) {
    if (!/^\d+$/.test(shirtNumberRaw)) return invalid("背番号は0〜99の整数で入力してください。");
    shirtNumber = Number(shirtNumberRaw);
    if (!Number.isInteger(shirtNumber) || shirtNumber < 0 || shirtNumber > 99) {
      return invalid("背番号は0〜99の整数で入力してください。");
    }
  }

  const positionRaw = text(formData, "primaryPosition");
  let primaryPosition: HandballPosition | null = null;
  if (positionRaw) {
    if (!HANDBALL_POSITIONS.includes(positionRaw as HandballPosition)) {
      return invalid("ポジションが正しくありません。");
    }
    primaryPosition = positionRaw as HandballPosition;
  }

  return {
    ok: true,
    value: {
      teamId,
      kind: rawKind as TeamMemberKind,
      fullName,
      displayName: optionalText(displayNameRaw),
      shirtNumber,
      primaryPosition,
      gradeOrAge: optionalText(gradeOrAgeRaw),
      isActive: formData.get("isActive") === "on",
      isPublic,
    },
  };
}
