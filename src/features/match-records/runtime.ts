import type {
  ActiveSuspension,
  MatchRecordSummary,
  ParticipantRecordSummary,
  RecordEvent,
  TeamSide,
} from "./types";

function numberPayload(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringPayload(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function booleanPayload(payload: Record<string, unknown>, key: string): boolean {
  return payload[key] === true;
}

function revertedIds(events: RecordEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    if ((event.eventType === "event_reverted" || event.eventType === "goal_reverted") && event.relatedEventId) {
      ids.add(event.relatedEventId);
    }
  }
  return ids;
}

export function isEventReverted(eventId: string, events: RecordEvent[]): boolean {
  return revertedIds(events).has(eventId);
}

export function remainingSuspensionMs(event: RecordEvent, competitionElapsedMs: number): number {
  if (event.eventType !== "suspension") return 0;
  const expiresAt = numberPayload(event.payload, "expires_at_competition_elapsed_ms");
  if (expiresAt === null) return 0;
  return Math.max(0, expiresAt - Math.max(0, competitionElapsedMs));
}

export function deriveActiveSuspensions(
  events: RecordEvent[],
  competitionElapsedMs: number,
): ActiveSuspension[] {
  const reverted = revertedIds(events);
  return events
    .filter((event) => event.eventType === "suspension" && !reverted.has(event.id))
    .map((event) => ({
      event,
      remainingMs: remainingSuspensionMs(event, competitionElapsedMs),
    }))
    .filter(({ remainingMs }) => remainingMs > 0)
    .map(({ event, remainingMs }) => ({
      eventId: event.id,
      side: event.subjectSide,
      subjectTeamMemberId: event.subjectTeamMemberId,
      subjectMatchRosterId: event.subjectMatchRosterId,
      shirtNumber: numberPayload(event.payload, "shirt_number"),
      displayName: stringPayload(event.payload, "display_name"),
      suspensionCount: numberPayload(event.payload, "suspension_count") ?? 1,
      remainingMs,
      resultingDisqualification: booleanPayload(event.payload, "resulting_disqualification"),
    }));
}

function participantKey(event: RecordEvent): string | null {
  if (event.subjectMatchRosterId) return `roster:${event.subjectMatchRosterId}`;
  if (event.subjectTeamMemberId) return `member:${event.subjectTeamMemberId}`;
  const shirtNumber = numberPayload(event.payload, "shirt_number");
  const displayName = stringPayload(event.payload, "display_name");
  if (event.subjectSide && (shirtNumber !== null || displayName)) {
    return `manual:${event.subjectSide}:${shirtNumber ?? ""}:${displayName ?? ""}`;
  }
  return null;
}

function createParticipant(event: RecordEvent): ParticipantRecordSummary {
  return {
    side: event.subjectSide,
    teamMemberId: event.subjectTeamMemberId,
    matchRosterId: event.subjectMatchRosterId,
    shirtNumber: numberPayload(event.payload, "shirt_number"),
    displayName: stringPayload(event.payload, "display_name"),
    goals: 0,
    goalTimesMs: [],
    sevenMeterGoals: 0,
    sevenMeterAttempts: 0,
    warnings: 0,
    suspensions: 0,
    disqualifications: 0,
  };
}

function pushTeamTimeout(
  summary: MatchRecordSummary,
  side: TeamSide,
  event: RecordEvent,
) {
  summary.teamTimeouts[side].push({
    period: event.period,
    periodElapsedMs: event.periodElapsedMs,
  });
}

export function deriveMatchRecordSummary(events: RecordEvent[]): MatchRecordSummary {
  const reverted = revertedIds(events);
  const summary: MatchRecordSummary = {
    participants: [],
    teamTimeouts: { home: [], away: [] },
  };
  const participants = new Map<string, ParticipantRecordSummary>();

  const ordered = [...events].sort((a, b) => a.stateVersion - b.stateVersion);
  for (const event of ordered) {
    if (reverted.has(event.id)) continue;
    if (event.eventType === "event_reverted" || event.eventType === "goal_reverted") continue;

    if (event.eventType === "team_timeout" && event.subjectSide) {
      pushTeamTimeout(summary, event.subjectSide, event);
      continue;
    }

    const key = participantKey(event);
    if (!key) continue;
    let participant = participants.get(key);
    if (!participant) {
      participant = createParticipant(event);
      participants.set(key, participant);
    }

    if (event.eventType === "goal") {
      participant.goals += 1;
      if (event.periodElapsedMs !== null) participant.goalTimesMs.push(event.periodElapsedMs);
      if (event.payload.goal_method === "seven_meter") {
        participant.sevenMeterGoals += 1;
        participant.sevenMeterAttempts += 1;
      }
    } else if (event.eventType === "seven_meter_missed") {
      participant.sevenMeterAttempts += 1;
    } else if (event.eventType === "warning") {
      participant.warnings += 1;
    } else if (event.eventType === "suspension") {
      participant.suspensions += 1;
      if (booleanPayload(event.payload, "resulting_disqualification")) {
        participant.disqualifications += 1;
      }
    } else if (event.eventType === "disqualification") {
      participant.disqualifications += 1;
    }
  }

  summary.participants = [...participants.values()];
  return summary;
}
