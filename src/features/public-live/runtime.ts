import {
  effectiveElapsedMs,
  formatClock,
  periodDurationMs,
} from "@/features/match-console/runtime";
import type { PublicLiveMatch, PublicMatchSummary } from "./types";

function toConsoleRuntime(live: PublicLiveMatch) {
  return {
    currentPeriod: live.state.currentPeriod,
    clockElapsedMs: live.state.clockElapsedMs,
    clockRunning: live.state.clockRunning,
    clockStartedAt: live.state.clockStartedAt,
    rules: live.rules,
  };
}

export function publicPeriodDurationMs(live: PublicLiveMatch) {
  return periodDurationMs(toConsoleRuntime(live));
}

export function effectivePublicElapsedMs(live: PublicLiveMatch, serverNowMs: number) {
  return effectiveElapsedMs(toConsoleRuntime(live), serverNowMs);
}

export function formatPublicClock(elapsedMs: number) {
  return formatClock(elapsedMs);
}

function statusRank(match: PublicMatchSummary, nowMs: number) {
  if (match.status === "live") return 0;
  if (match.status === "scheduled" && Date.parse(match.scheduledAt) >= nowMs) return 1;
  if (match.status === "scheduled") return 2;
  if (match.status === "finished") return 3;
  return 4;
}

export function sortPublicMatchSummaries(
  matches: PublicMatchSummary[],
  nowMs: number = Date.now(),
) {
  return [...matches].sort((a, b) => {
    const rankDiff = statusRank(a, nowMs) - statusRank(b, nowMs);
    if (rankDiff !== 0) return rankDiff;

    const aTime = Date.parse(a.scheduledAt);
    const bTime = Date.parse(b.scheduledAt);

    if (a.status === "finished" && b.status === "finished") return bTime - aTime;
    return aTime - bTime;
  });
}
