import type { ConsoleParticipant } from "@/features/match-console/types";
import { Button } from "@/components/ui/button";

export function ParticipantPicker({
  participants,
  allowStaff,
  disabled,
  onSelect,
}: {
  participants: ConsoleParticipant[];
  allowStaff: boolean;
  disabled: boolean;
  onSelect: (participant: ConsoleParticipant) => void;
}) {
  const available = participants.filter(
    (participant) => allowStaff || participant.kind === "player",
  );

  if (available.length === 0) {
    return (
      <p className="rounded-xl bg-primary-foreground/8 px-3 py-3 text-sm font-semibold text-primary-foreground/65">
        試合ロスターに選択できる対象者がいません。
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {available.map((participant) => (
        <Button
          key={participant.matchRosterId}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onSelect(participant)}
          className="min-h-14 justify-start px-3 text-left"
        >
          <span className="min-w-7 text-base font-black">
            {participant.shirtNumber !== null ? `#${participant.shirtNumber}` : "—"}
          </span>
          <span className="truncate text-sm font-bold">{participant.displayName}</span>
        </Button>
      ))}
    </div>
  );
}
