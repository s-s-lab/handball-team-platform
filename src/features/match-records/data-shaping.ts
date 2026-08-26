import type { RecordEvent, RecordEventType, TeamSide } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set<RecordEventType>([
  "clock_started",
  "clock_stopped",
  "clock_reset",
  "period_changed",
  "goal",
  "goal_attributed",
  "goal_reverted",
  "match_finished",
  "seven_meter_missed",
  "warning",
  "suspension",
  "disqualification",
  "team_timeout",
  "event_reverted",
]);
const SIDES = new Set<TeamSide>(["home", "away"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function nullableInteger(value: unknown): number | null | undefined {
  if (value === null) return null;
  const parsed = finiteInteger(value);
  return parsed === null ? undefined : parsed;
}

function nullableUuid(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) return undefined;
  return value;
}

function nullableSide(value: unknown): TeamSide | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !SIDES.has(value as TeamSide)) return undefined;
  return value as TeamSide;
}

function mapRecordEventRow(value: unknown): RecordEvent | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== "string" || !UUID_PATTERN.test(value.id)) return null;
  if (typeof value.match_id !== "string" || !UUID_PATTERN.test(value.match_id)) return null;

  const stateVersion = finiteInteger(value.state_version);
  if (stateVersion === null || stateVersion < 1) return null;
  if (typeof value.event_type !== "string" || !EVENT_TYPES.has(value.event_type as RecordEventType)) return null;

  const relatedEventId = nullableUuid(value.related_event_id);
  const period = nullableInteger(value.period);
  const periodElapsedMs = nullableInteger(value.period_elapsed_ms);
  const competitionElapsedMs = nullableInteger(value.competition_elapsed_ms);
  const subjectSide = nullableSide(value.subject_side);
  const subjectTeamMemberId = nullableUuid(value.subject_team_member_id);
  const subjectMatchRosterId = nullableUuid(value.subject_match_roster_id);

  if (
    relatedEventId === undefined ||
    period === undefined ||
    periodElapsedMs === undefined ||
    competitionElapsedMs === undefined ||
    subjectSide === undefined ||
    subjectTeamMemberId === undefined ||
    subjectMatchRosterId === undefined ||
    !isObject(value.payload) ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    matchId: value.match_id,
    stateVersion,
    eventType: value.event_type as RecordEventType,
    relatedEventId,
    period,
    periodElapsedMs,
    competitionElapsedMs,
    subjectSide,
    subjectTeamMemberId,
    subjectMatchRosterId,
    payload: value.payload,
    createdAt: value.created_at,
  };
}

export function mapRecordEventRows(value: unknown): RecordEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const mapped = mapRecordEventRow(row);
    return mapped ? [mapped] : [];
  });
}
