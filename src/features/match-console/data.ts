import "server-only";

import { getMatchForCurrentUser } from "@/features/matches/data";
import { createClient } from "@/lib/supabase/server";
import type { ConsoleMatchStatus, ConsoleSnapshot, MatchConsoleData } from "./types";

const statuses = new Set<ConsoleMatchStatus>(["scheduled", "live", "finished", "cancelled"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapConsoleSnapshot(value: unknown): ConsoleSnapshot | null {
  if (!isObject(value)) return null;

  const matchId = typeof value.match_id === "string" ? value.match_id : null;
  const version = finiteNumber(value.version);
  const currentPeriod = finiteNumber(value.current_period);
  const clockElapsedMs = finiteNumber(value.clock_elapsed_ms);
  const competitionElapsedMs = finiteNumber(value.competition_elapsed_ms);
  const clockRunning = typeof value.clock_running === "boolean" ? value.clock_running : null;
  const clockStartedAt =
    value.clock_started_at === null || typeof value.clock_started_at === "string"
      ? value.clock_started_at
      : undefined;
  const homeScore = finiteNumber(value.home_score);
  const awayScore = finiteNumber(value.away_score);
  const matchStatus =
    typeof value.match_status === "string" && statuses.has(value.match_status as ConsoleMatchStatus)
      ? (value.match_status as ConsoleMatchStatus)
      : null;
  const periodDurationMs = finiteNumber(value.period_duration_ms);
  const serverNow = typeof value.server_now === "string" ? value.server_now : null;

  if (
    !matchId ||
    version === null ||
    currentPeriod === null ||
    clockElapsedMs === null ||
    competitionElapsedMs === null ||
    clockRunning === null ||
    clockStartedAt === undefined ||
    homeScore === null ||
    awayScore === null ||
    !matchStatus ||
    periodDurationMs === null ||
    !serverNow
  ) {
    return null;
  }

  return {
    matchId,
    version,
    currentPeriod,
    clockElapsedMs,
    competitionElapsedMs,
    clockRunning,
    clockStartedAt,
    homeScore,
    awayScore,
    matchStatus,
    periodDurationMs,
    serverNow,
  };
}

export async function getMatchConsoleForCurrentUser(matchId: string): Promise<MatchConsoleData | null> {
  const match = await getMatchForCurrentUser(matchId);
  if (!match) return null;

  const supabase = await createClient();
  const [{ data: team, error: teamError }, { data: rawSnapshot, error: snapshotError }] =
    await Promise.all([
      supabase.from("teams").select("name").eq("id", match.teamId).maybeSingle(),
      supabase.rpc("get_match_console_snapshot", { p_match_id: matchId }),
    ]);

  if (teamError || snapshotError || !team) {
    throw new Error("MATCH CONSOLEを読み込めませんでした。");
  }

  const snapshot = mapConsoleSnapshot(rawSnapshot);
  if (!snapshot) throw new Error("試合状態を読み込めませんでした。");

  const teamIsHome = match.teamSide === "home";

  return {
    matchId: match.id,
    matchName: match.name,
    teamId: match.teamId,
    homeName: teamIsHome ? team.name : match.opponentName,
    awayName: teamIsHome ? match.opponentName : team.name,
    rules: {
      periodCount: match.rules.periodCount,
      periodSeconds: match.rules.periodSeconds,
      overtimeEnabled: match.rules.overtimeEnabled,
      overtimePeriodCount: match.rules.overtimePeriodCount,
      overtimePeriodSeconds: match.rules.overtimePeriodSeconds,
    },
    snapshot,
  };
}
