"use client";

import { useMemo, useState } from "react";
import { CircleAlert, Clock3, FileClock, ShieldAlert, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/features/match-console/runtime";
import type {
  ConsoleActionName,
  ConsoleActionPayload,
  ConsoleParticipant,
  ConsoleSnapshot,
  ConsoleTeamSide,
} from "@/features/match-console/types";
import {
  effectiveCompetitionElapsedMs,
  latestUnattributedGoal,
} from "@/features/match-records/console-view-model";
import { deriveActiveSuspensions } from "@/features/match-records/runtime";
import type { RecordEvent } from "@/features/match-records/types";
import { ActiveSuspensions } from "./active-suspensions";
import { ParticipantPicker } from "./participant-picker";
import { RecentEvents } from "./recent-events";

type DockMode = "seven_meter" | "warning" | "suspension" | "disqualification" | "team_timeout" | "records";
type SevenMeterOutcome = "goal" | "miss";

export type RecordDockAction = (
  action: ConsoleActionName,
  payload?: ConsoleActionPayload,
) => Promise<void>;

function payloadSide(event: RecordEvent): ConsoleTeamSide | null {
  if (event.subjectSide) return event.subjectSide;
  return event.payload.side === "home" || event.payload.side === "away" ? event.payload.side : null;
}

function actionForMode(mode: DockMode): ConsoleActionName | null {
  if (mode === "warning") return "warning";
  if (mode === "suspension") return "suspension";
  if (mode === "disqualification") return "disqualification";
  if (mode === "team_timeout") return "team_timeout";
  return null;
}

function panelTitle(mode: DockMode) {
  if (mode === "seven_meter") return "7mを記録";
  if (mode === "warning") return "警告を記録";
  if (mode === "suspension") return "2分間退場を記録";
  if (mode === "disqualification") return "失格を記録";
  if (mode === "team_timeout") return "チームタイムアウト";
  return "最近の記録";
}

export function RecordDock({
  managedSide,
  homeName,
  awayName,
  participants,
  snapshot,
  displayElapsedMs,
  events,
  disabled,
  onAction,
}: {
  managedSide: ConsoleTeamSide;
  homeName: string;
  awayName: string;
  participants: ConsoleParticipant[];
  snapshot: ConsoleSnapshot;
  displayElapsedMs: number;
  events: RecordEvent[];
  disabled: boolean;
  onAction: RecordDockAction;
}) {
  const [mode, setMode] = useState<DockMode | null>(null);
  const [side, setSide] = useState<ConsoleTeamSide>(managedSide);
  const [sevenMeterOutcome, setSevenMeterOutcome] = useState<SevenMeterOutcome>("goal");
  const [manualNumber, setManualNumber] = useState("");
  const [manualName, setManualName] = useState("");
  const [subjectKind, setSubjectKind] = useState<"player" | "staff">("player");
  const [reportRequired, setReportRequired] = useState(false);

  const competitionElapsedMs = effectiveCompetitionElapsedMs({
    competitionElapsedMs: snapshot.competitionElapsedMs,
    clockElapsedMs: snapshot.clockElapsedMs,
    displayElapsedMs,
    clockRunning: snapshot.clockRunning,
  });
  const activeSuspensions = useMemo(
    () => deriveActiveSuspensions(events, competitionElapsedMs),
    [competitionElapsedMs, events],
  );
  const unattributedGoal = useMemo(() => latestUnattributedGoal(events), [events]);
  const unattributedSide = unattributedGoal ? payloadSide(unattributedGoal) : null;
  const managedParticipants = participants;

  async function submitParticipant(participant: ConsoleParticipant) {
    if (!mode || mode === "team_timeout" || mode === "records") return;
    const base = { side, subject_match_roster_id: participant.matchRosterId };
    if (mode === "seven_meter") {
      await onAction(
        sevenMeterOutcome === "goal" ? "goal" : "seven_meter_missed",
        sevenMeterOutcome === "goal" ? { ...base, goal_method: "seven_meter" } : base,
      );
    } else {
      const action = actionForMode(mode);
      if (action) {
        await onAction(action, {
          ...base,
          ...(mode === "disqualification" && reportRequired ? { report_required: true } : {}),
        });
      }
    }
    setMode(null);
  }

  async function submitManual() {
    if (!mode || mode === "team_timeout" || mode === "records") return;
    const base: ConsoleActionPayload = { side, subject_kind: subjectKind };
    if (manualNumber) base.shirt_number = Number(manualNumber);
    if (manualName.trim()) base.display_name = manualName.trim();

    if (mode === "seven_meter") {
      await onAction(
        sevenMeterOutcome === "goal" ? "goal" : "seven_meter_missed",
        sevenMeterOutcome === "goal" ? { ...base, goal_method: "seven_meter" } : base,
      );
    } else {
      const action = actionForMode(mode);
      if (action) {
        await onAction(action, {
          ...base,
          ...(mode === "disqualification" && reportRequired ? { report_required: true } : {}),
        });
      }
    }
    setMode(null);
  }

  async function attributeManagedGoal(participant: ConsoleParticipant) {
    if (!unattributedGoal) return;
    await onAction("attribute_goal", {
      target_event_id: unattributedGoal.id,
      subject_match_roster_id: participant.matchRosterId,
    });
  }

  async function attributeManualGoal() {
    if (!unattributedGoal) return;
    const payload: ConsoleActionPayload = { target_event_id: unattributedGoal.id };
    if (manualNumber) payload.shirt_number = Number(manualNumber);
    if (manualName.trim()) payload.display_name = manualName.trim();
    await onAction("attribute_goal", payload);
  }

  function open(nextMode: DockMode) {
    setMode((current) => (current === nextMode ? null : nextMode));
    setSide(managedSide);
    setSubjectKind("player");
    setReportRequired(false);
    setManualNumber("");
    setManualName("");
  }

  const participantMode = mode && !["team_timeout", "records"].includes(mode);
  const selectedIsManaged = side === managedSide;

  return (
    <div className="space-y-3">
      <ActiveSuspensions suspensions={activeSuspensions} />

      {unattributedGoal && unattributedSide ? (
        <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black tracking-[0.12em] text-primary-foreground/55">得点者を記録</p>
              <p className="mt-1 text-sm font-bold">
                {unattributedSide === "home" ? homeName : awayName} · {unattributedGoal.periodElapsedMs !== null ? formatClock(unattributedGoal.periodElapsedMs) : "--:--"}
              </p>
            </div>
            <span className="rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[11px] font-bold">スコア反映済み</span>
          </div>
          <div className="mt-3">
            {unattributedSide === managedSide ? (
              <ParticipantPicker
                participants={managedParticipants}
                allowStaff={false}
                disabled={disabled}
                onSelect={(participant) => void attributeManagedGoal(participant)}
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
                <input
                  type="number"
                  min={0}
                  max={99}
                  inputMode="numeric"
                  value={manualNumber}
                  onChange={(event) => setManualNumber(event.target.value)}
                  placeholder="背番号"
                  className="min-h-12 rounded-xl border border-primary-foreground/20 bg-black/10 px-3 text-sm font-bold outline-none placeholder:text-primary-foreground/35"
                  aria-label="相手得点者の背番号"
                />
                <input
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder="表示名（任意）"
                  className="min-h-12 rounded-xl border border-primary-foreground/20 bg-black/10 px-3 text-sm font-bold outline-none placeholder:text-primary-foreground/35"
                  aria-label="相手得点者の表示名"
                />
                <Button type="button" variant="secondary" disabled={disabled || (!manualNumber && !manualName.trim())} onClick={() => void attributeManualGoal()}>
                  登録
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="試合記録操作">
        <Button type="button" variant={mode === "seven_meter" ? "secondary" : "outline"} disabled={disabled} onClick={() => open("seven_meter")} className="min-h-14 font-black">
          7m
        </Button>
        <Button type="button" variant={mode === "warning" ? "secondary" : "outline"} disabled={disabled} onClick={() => open("warning")} className="min-h-14 font-black">
          <CircleAlert aria-hidden="true" /> 警告
        </Button>
        <Button type="button" variant={mode === "suspension" ? "secondary" : "outline"} disabled={disabled} onClick={() => open("suspension")} className="min-h-14 font-black">
          <TimerOff aria-hidden="true" /> 2分
        </Button>
        <Button type="button" variant={mode === "disqualification" ? "secondary" : "outline"} disabled={disabled} onClick={() => open("disqualification")} className="min-h-14 font-black">
          <ShieldAlert aria-hidden="true" /> 失格
        </Button>
        <Button type="button" variant={mode === "team_timeout" ? "secondary" : "outline"} disabled={disabled} onClick={() => open("team_timeout")} className="min-h-14 font-black">
          <Clock3 aria-hidden="true" /> TTO
        </Button>
        <Button type="button" variant={mode === "records" ? "secondary" : "outline"} onClick={() => open("records")} className="min-h-14 font-black">
          <FileClock aria-hidden="true" /> 記録
        </Button>
      </div>

      {mode ? (
        <div className="rounded-2xl bg-primary-foreground/8 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black">{panelTitle(mode)}</h3>
            <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)}>閉じる</Button>
          </div>

          {mode === "records" ? (
            <div className="mt-3">
              <RecentEvents
                events={events}
                disabled={disabled}
                onRevert={(event) => void onAction("revert_event", { target_event_id: event.id, reason: "入力訂正" })}
              />
            </div>
          ) : mode === "team_timeout" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-14" disabled={disabled} onClick={() => void onAction("team_timeout", { side: "home" })}>
                HOME · {homeName}
              </Button>
              <Button type="button" variant="outline" className="min-h-14" disabled={disabled} onClick={() => void onAction("team_timeout", { side: "away" })}>
                AWAY · {awayName}
              </Button>
            </div>
          ) : participantMode ? (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={side === "home" ? "secondary" : "outline"} onClick={() => setSide("home")}>HOME</Button>
                <Button type="button" variant={side === "away" ? "secondary" : "outline"} onClick={() => setSide("away")}>AWAY</Button>
              </div>

              {mode === "seven_meter" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={sevenMeterOutcome === "goal" ? "secondary" : "outline"} onClick={() => setSevenMeterOutcome("goal")}>7m 成功</Button>
                  <Button type="button" variant={sevenMeterOutcome === "miss" ? "secondary" : "outline"} onClick={() => setSevenMeterOutcome("miss")}>7m 失敗</Button>
                </div>
              ) : null}

              {mode === "disqualification" ? (
                <label className="flex min-h-12 items-center gap-3 rounded-xl bg-black/10 px-3 text-sm font-bold">
                  <input type="checkbox" checked={reportRequired} onChange={(event) => setReportRequired(event.target.checked)} className="size-5" />
                  報告書を伴う失格（ブルーカード）
                </label>
              ) : null}

              {selectedIsManaged ? (
                <ParticipantPicker
                  participants={managedParticipants}
                  allowStaff={mode !== "seven_meter"}
                  disabled={disabled}
                  onSelect={(participant) => void submitParticipant(participant)}
                />
              ) : (
                <div className="space-y-2">
                  {mode !== "seven_meter" ? (
                    <select
                      value={subjectKind}
                      onChange={(event) => setSubjectKind(event.target.value as "player" | "staff")}
                      className="min-h-12 w-full rounded-xl border border-primary-foreground/20 bg-primary px-3 text-sm font-bold"
                      aria-label="相手チームの対象区分"
                    >
                      <option value="player">選手</option>
                      <option value="staff">スタッフ</option>
                    </select>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      inputMode="numeric"
                      value={manualNumber}
                      onChange={(event) => setManualNumber(event.target.value)}
                      placeholder="背番号"
                      className="min-h-12 rounded-xl border border-primary-foreground/20 bg-black/10 px-3 text-sm font-bold outline-none placeholder:text-primary-foreground/35"
                    />
                    <input
                      value={manualName}
                      onChange={(event) => setManualName(event.target.value)}
                      placeholder="表示名"
                      className="min-h-12 rounded-xl border border-primary-foreground/20 bg-black/10 px-3 text-sm font-bold outline-none placeholder:text-primary-foreground/35"
                    />
                    <Button type="button" variant="secondary" disabled={disabled || (!manualNumber && !manualName.trim())} onClick={() => void submitManual()}>
                      記録
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
