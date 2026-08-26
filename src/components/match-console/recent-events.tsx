import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/features/match-console/runtime";
import { recentActionableEvents } from "@/features/match-records/console-view-model";
import { isEventReverted } from "@/features/match-records/runtime";
import type { RecordEvent } from "@/features/match-records/types";

function stringPayload(event: RecordEvent, key: string) {
  const value = event.payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberPayload(event: RecordEvent, key: string) {
  const value = event.payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function eventLabel(event: RecordEvent) {
  if (event.eventType === "goal") return event.payload.goal_method === "seven_meter" ? "7m GOAL" : "GOAL";
  if (event.eventType === "goal_attributed") return "得点者";
  if (event.eventType === "seven_meter_missed") return "7m MISS";
  if (event.eventType === "warning") return "警告";
  if (event.eventType === "suspension") return "2分間退場";
  if (event.eventType === "disqualification") return event.payload.report_required === true ? "失格 + 報告" : "失格";
  if (event.eventType === "team_timeout") return "TTO";
  if (event.eventType === "event_reverted") return "訂正";
  return event.eventType;
}

function subjectLabel(event: RecordEvent) {
  const number = numberPayload(event, "shirt_number");
  const name = stringPayload(event, "display_name");
  if (number !== null || name) return `${number !== null ? `#${number}` : ""}${number !== null && name ? " " : ""}${name ?? ""}`;
  if (event.subjectSide === "home") return "HOME";
  if (event.subjectSide === "away") return "AWAY";
  return "—";
}

function canRevert(event: RecordEvent, events: RecordEvent[]) {
  return (
    ["goal", "goal_attributed", "seven_meter_missed", "warning", "suspension", "disqualification", "team_timeout"].includes(event.eventType) &&
    !isEventReverted(event.id, events)
  );
}

export function RecentEvents({
  events,
  disabled,
  onRevert,
}: {
  events: RecordEvent[];
  disabled: boolean;
  onRevert: (event: RecordEvent) => void;
}) {
  const recent = recentActionableEvents(events, 10);

  if (recent.length === 0) {
    return <p className="text-sm font-semibold text-primary-foreground/60">まだ試合記録はありません。</p>;
  }

  return (
    <div className="space-y-2">
      {recent.map((event) => (
        <div key={event.id} className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-2">
          <div className="w-16 shrink-0 font-mono text-xs font-bold tabular-nums text-primary-foreground/60">
            {event.periodElapsedMs !== null ? formatClock(event.periodElapsedMs) : "--:--"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">{eventLabel(event)}</p>
            <p className="truncate text-xs font-semibold text-primary-foreground/60">{subjectLabel(event)}</p>
          </div>
          {canRevert(event, events) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onRevert(event)}
              aria-label={`${eventLabel(event)}を訂正`}
            >
              <Undo2 aria-hidden="true" /> 訂正
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
