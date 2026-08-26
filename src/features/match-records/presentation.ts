import { formatClock } from "@/features/match-console/runtime";
import type { RecordEvent, RecordEventType, TeamSide } from "./types";

export type RecordTimelineItem = {
  eventId: string;
  eventType: RecordEventType;
  label: string;
  clock: string;
  subject: string | null;
  side: TeamSide | null;
  reverted: boolean;
  correction: boolean;
  relatedEventId: string | null;
  reason: string | null;
};

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

function periodLabel(period: number, periodCount: number) {
  if (periodCount === 2 && period === 1) return "前半";
  if (periodCount === 2 && period === 2) return "後半";
  if (period <= periodCount) return `第${period}ピリオド`;
  return `延長${period - periodCount}`;
}

export function formatRecordClock(event: RecordEvent, periodCount = 2): string {
  if (event.period === null || event.periodElapsedMs === null) return "時刻未記録";
  return `${periodLabel(event.period, periodCount)} ${formatClock(event.periodElapsedMs)}`;
}

export function recordEventLabel(event: RecordEvent): string {
  switch (event.eventType) {
    case "goal":
      return event.payload.goal_method === "seven_meter" ? "7m得点" : "得点";
    case "goal_attributed":
      return "得点者登録";
    case "goal_reverted":
      return "得点取消";
    case "seven_meter_missed":
      return "7m失敗";
    case "warning":
      return "警告";
    case "suspension": {
      const count = numberPayload(event.payload, "suspension_count");
      const disqualified = booleanPayload(event.payload, "resulting_disqualification");
      if (disqualified && count !== null) return `2分間退場（${count}回目・失格）`;
      if (count !== null && count > 1) return `2分間退場（${count}回目）`;
      return "2分間退場";
    }
    case "disqualification":
      return booleanPayload(event.payload, "report_required") ? "失格（報告書あり）" : "失格";
    case "team_timeout":
      return "チームタイムアウト";
    case "event_reverted":
      return "訂正";
    case "match_finished":
      return "試合終了";
    case "clock_started":
      return "時計開始";
    case "clock_stopped":
      return "時計停止";
    case "clock_reset":
      return "時計リセット";
    case "period_changed":
      return "ピリオド変更";
  }
}

export function formatRecordSubject(event: RecordEvent): string | null {
  const shirtNumber = numberPayload(event.payload, "shirt_number");
  const displayName = stringPayload(event.payload, "display_name");
  if (shirtNumber !== null && displayName) return `#${shirtNumber} ${displayName}`;
  if (shirtNumber !== null) return `#${shirtNumber}`;
  return displayName;
}

function revertedEventIds(events: RecordEvent[]) {
  const ids = new Set<string>();
  for (const event of events) {
    if (
      (event.eventType === "event_reverted" || event.eventType === "goal_reverted") &&
      event.relatedEventId
    ) {
      ids.add(event.relatedEventId);
    }
  }
  return ids;
}

function goalAttributions(events: RecordEvent[], reverted: Set<string>) {
  const attributions = new Map<string, RecordEvent>();
  for (const event of [...events].sort((a, b) => a.stateVersion - b.stateVersion)) {
    if (
      event.eventType === "goal_attributed" &&
      event.relatedEventId &&
      !reverted.has(event.id)
    ) {
      attributions.set(event.relatedEventId, event);
    }
  }
  return attributions;
}

function mergeGoalAttribution(goal: RecordEvent, attribution?: RecordEvent): RecordEvent {
  if (!attribution) return goal;
  return {
    ...goal,
    subjectSide: attribution.subjectSide ?? goal.subjectSide,
    subjectTeamMemberId: attribution.subjectTeamMemberId ?? goal.subjectTeamMemberId,
    subjectMatchRosterId: attribution.subjectMatchRosterId ?? goal.subjectMatchRosterId,
    payload: { ...goal.payload, ...attribution.payload },
  };
}

const TIMELINE_TYPES = new Set<RecordEventType>([
  "goal",
  "goal_reverted",
  "seven_meter_missed",
  "warning",
  "suspension",
  "disqualification",
  "team_timeout",
  "event_reverted",
  "match_finished",
]);

export function buildRecordTimeline(events: RecordEvent[], periodCount = 2): RecordTimelineItem[] {
  const reverted = revertedEventIds(events);
  const attributions = goalAttributions(events, reverted);

  return [...events]
    .sort((a, b) => a.stateVersion - b.stateVersion)
    .filter((event) => TIMELINE_TYPES.has(event.eventType))
    .map((sourceEvent) => {
      const event = sourceEvent.eventType === "goal"
        ? mergeGoalAttribution(sourceEvent, attributions.get(sourceEvent.id))
        : sourceEvent;
      const correction = event.eventType === "event_reverted" || event.eventType === "goal_reverted";
      return {
        eventId: sourceEvent.id,
        eventType: sourceEvent.eventType,
        label: recordEventLabel(event),
        clock: formatRecordClock(event, periodCount),
        subject: formatRecordSubject(event),
        side: event.subjectSide,
        reverted: !correction && reverted.has(sourceEvent.id),
        correction,
        relatedEventId: sourceEvent.relatedEventId,
        reason: stringPayload(sourceEvent.payload, "reason"),
      };
    });
}
