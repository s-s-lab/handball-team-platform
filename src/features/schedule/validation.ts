import { japanLocalDateTimeToIso } from "@/features/matches/validation";
import type { ParseResult } from "@/features/team-core/types";
import {
  TEAM_EVENT_STATUSES,
  TEAM_EVENT_TYPES,
  type ScheduleEventInput,
  type TeamEventStatus,
  type TeamEventType,
} from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: string) {
  return value ? value : null;
}

function invalid<T>(message: string): ParseResult<T> {
  return { ok: false, message };
}

export function parseScheduleForm(formData: FormData): ParseResult<ScheduleEventInput> {
  const teamId = text(formData, "teamId");
  if (!UUID_RE.test(teamId)) return invalid("チーム情報が正しくありません。");

  const eventTypeRaw = text(formData, "eventType");
  if (!TEAM_EVENT_TYPES.includes(eventTypeRaw as TeamEventType)) {
    return invalid("予定の種類を選択してください。");
  }

  const title = text(formData, "title");
  if (!title) return invalid("予定名を入力してください。");
  if (title.length > 120) return invalid("予定名は120文字以内で入力してください。");

  const startsAt = japanLocalDateTimeToIso(text(formData, "startsAt"));
  if (!startsAt) return invalid("開始日時を正しく入力してください。");

  const endsAtRaw = text(formData, "endsAt");
  const endsAt = endsAtRaw ? japanLocalDateTimeToIso(endsAtRaw) : null;
  if (endsAtRaw && !endsAt) return invalid("終了日時を正しく入力してください。");
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return invalid("終了日時は開始日時以降にしてください。");
  }

  const venue = text(formData, "venue");
  if (venue.length > 120) return invalid("場所は120文字以内で入力してください。");

  const memo = text(formData, "memo");
  if (memo.length > 2000) return invalid("メモは2000文字以内で入力してください。");

  const statusRaw = text(formData, "status") || "scheduled";
  if (!TEAM_EVENT_STATUSES.includes(statusRaw as TeamEventStatus)) {
    return invalid("予定の状態が正しくありません。");
  }

  return {
    ok: true,
    value: {
      teamId,
      eventType: eventTypeRaw as TeamEventType,
      title,
      startsAt,
      endsAt,
      venue: optional(venue),
      memo: optional(memo),
      status: statusRaw as TeamEventStatus,
    },
  };
}

export function isUuid(value: string) {
  return UUID_RE.test(value);
}
