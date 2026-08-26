import { isEventReverted } from "./runtime";
import type { RecordEvent } from "./types";

const ACTIONABLE_EVENT_TYPES = new Set<RecordEvent["eventType"]>([
  "goal",
  "goal_attributed",
  "seven_meter_missed",
  "warning",
  "suspension",
  "disqualification",
  "team_timeout",
  "event_reverted",
]);

export function effectiveCompetitionElapsedMs(input: {
  competitionElapsedMs: number;
  clockElapsedMs: number;
  displayElapsedMs: number;
  clockRunning: boolean;
}) {
  const persisted = Math.max(0, input.competitionElapsedMs);
  if (!input.clockRunning) return persisted;
  const runningDelta = Math.max(0, input.displayElapsedMs - Math.max(0, input.clockElapsedMs));
  return persisted + runningDelta;
}

export function latestUnattributedGoal(events: RecordEvent[]): RecordEvent | null {
  const attributedGoalIds = new Set(
    events
      .filter(
        (event) =>
          event.eventType === "goal_attributed" &&
          event.relatedEventId &&
          !isEventReverted(event.id, events),
      )
      .map((event) => event.relatedEventId as string),
  );

  return (
    [...events]
      .sort((a, b) => b.stateVersion - a.stateVersion)
      .find(
        (event) =>
          event.eventType === "goal" &&
          !isEventReverted(event.id, events) &&
          !attributedGoalIds.has(event.id) &&
          !event.subjectMatchRosterId &&
          !event.subjectTeamMemberId &&
          typeof event.payload.scorer_team_member_id !== "string",
      ) ?? null
  );
}

export function recentActionableEvents(events: RecordEvent[], limit = 8): RecordEvent[] {
  return [...events]
    .filter((event) => ACTIONABLE_EVENT_TYPES.has(event.eventType))
    .sort((a, b) => b.stateVersion - a.stateVersion)
    .slice(0, Math.max(0, limit));
}
