import type {
  PublicLiveMatch,
  PublicMatchStatus,
  PublicMatchSummary,
  PublicTeamSide,
} from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set<PublicMatchStatus>(["scheduled", "live", "finished", "cancelled"]);
const SIDES = new Set<PublicTeamSide>(["home", "away"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isInteger(value: unknown, min = 0): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min;
}

function isStatus(value: unknown): value is PublicMatchStatus {
  return typeof value === "string" && STATUSES.has(value as PublicMatchStatus);
}

function isSide(value: unknown): value is PublicTeamSide {
  return typeof value === "string" && SIDES.has(value as PublicTeamSide);
}

export function shapePublicLiveMatch(input: unknown): PublicLiveMatch | null {
  if (!isRecord(input) || !isRecord(input.rules) || !isRecord(input.state)) return null;

  const rules = input.rules;
  const state = input.state;

  if (
    !isUuid(input.match_id) ||
    !isNonEmptyString(input.match_name) ||
    !isUuid(input.team_id) ||
    !isNonEmptyString(input.team_name) ||
    !isNullableString(input.team_short_name) ||
    !isNonEmptyString(input.opponent_name) ||
    !isSide(input.team_side) ||
    !isTimestamp(input.scheduled_at) ||
    !isNullableString(input.venue) ||
    !isStatus(input.status) ||
    !isTimestamp(input.server_now) ||
    !isInteger(rules.period_count, 1) ||
    !isInteger(rules.period_seconds, 1) ||
    typeof rules.overtime_enabled !== "boolean" ||
    !isInteger(rules.overtime_period_count, 1) ||
    !isInteger(rules.overtime_period_seconds, 1) ||
    !isInteger(state.version) ||
    !isInteger(state.current_period, 1) ||
    !isInteger(state.clock_elapsed_ms) ||
    typeof state.clock_running !== "boolean" ||
    !isNullableTimestamp(state.clock_started_at) ||
    !isInteger(state.home_score) ||
    !isInteger(state.away_score)
  ) {
    return null;
  }

  return {
    matchId: input.match_id,
    matchName: input.match_name,
    teamId: input.team_id,
    teamName: input.team_name,
    teamShortName: input.team_short_name,
    opponentName: input.opponent_name,
    teamSide: input.team_side,
    scheduledAt: input.scheduled_at,
    venue: input.venue,
    status: input.status,
    serverNow: input.server_now,
    rules: {
      periodCount: rules.period_count,
      periodSeconds: rules.period_seconds,
      overtimeEnabled: rules.overtime_enabled,
      overtimePeriodCount: rules.overtime_period_count,
      overtimePeriodSeconds: rules.overtime_period_seconds,
    },
    state: {
      version: state.version,
      currentPeriod: state.current_period,
      clockElapsedMs: state.clock_elapsed_ms,
      clockRunning: state.clock_running,
      clockStartedAt: state.clock_started_at,
      homeScore: state.home_score,
      awayScore: state.away_score,
    },
  };
}

function shapePublicMatchSummary(input: unknown): PublicMatchSummary | null {
  if (!isRecord(input)) return null;

  if (
    !isUuid(input.match_id) ||
    !isNonEmptyString(input.match_name) ||
    !isNonEmptyString(input.opponent_name) ||
    !isSide(input.team_side) ||
    !isTimestamp(input.scheduled_at) ||
    !isNullableString(input.venue) ||
    !isStatus(input.status) ||
    !isInteger(input.home_score) ||
    !isInteger(input.away_score)
  ) {
    return null;
  }

  return {
    matchId: input.match_id,
    matchName: input.match_name,
    opponentName: input.opponent_name,
    teamSide: input.team_side,
    scheduledAt: input.scheduled_at,
    venue: input.venue,
    status: input.status,
    homeScore: input.home_score,
    awayScore: input.away_score,
  };
}

export function shapePublicMatchSummaries(input: unknown): PublicMatchSummary[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((row) => {
    const shaped = shapePublicMatchSummary(row);
    return shaped ? [shaped] : [];
  });
}
