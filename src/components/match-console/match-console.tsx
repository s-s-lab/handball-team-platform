"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildConsoleActionFormData } from "@/features/match-console/action-form";
import {
  applyConsoleAction,
  refreshConsoleRecordEvents,
} from "@/features/match-console/actions";
import { effectiveElapsedMs, formatClock } from "@/features/match-console/runtime";
import type {
  ConsoleActionName,
  ConsoleActionPayload,
  ConsoleSnapshot,
  MatchConsoleData,
} from "@/features/match-console/types";
import { RecordDock } from "./record-dock";

const RECORD_DOCK_ACTIONS = new Set<ConsoleActionName>([
  "goal",
  "attribute_goal",
  "undo_last_goal",
  "seven_meter_missed",
  "warning",
  "suspension",
  "disqualification",
  "team_timeout",
  "revert_event",
]);

function periodLabel(currentPeriod: number, periodCount: number) {
  if (periodCount === 2 && currentPeriod === 1) return "前半";
  if (periodCount === 2 && currentPeriod === 2) return "後半";
  if (currentPeriod <= periodCount) return `第${currentPeriod}ピリオド`;
  return `延長${currentPeriod - periodCount}`;
}

export function MatchConsole({ data }: { data: MatchConsoleData }) {
  const [snapshot, setSnapshot] = useState(data.snapshot);
  const [recordEvents, setRecordEvents] = useState(data.recordEvents);
  const [serverOffsetMs, setServerOffsetMs] = useState(() => {
    const serverNow = Date.parse(data.snapshot.serverNow);
    return Number.isFinite(serverNow) ? serverNow - Date.now() : 0;
  });
  const [displayElapsedMs, setDisplayElapsedMs] = useState(data.snapshot.clockElapsedMs);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const maxPeriod =
    data.rules.periodCount +
    (data.rules.overtimeEnabled ? data.rules.overtimePeriodCount : 0);
  const finished = snapshot.matchStatus === "finished" || snapshot.matchStatus === "cancelled";

  const runtimeSnapshot = useMemo(
    () => ({
      currentPeriod: snapshot.currentPeriod,
      clockElapsedMs: snapshot.clockElapsedMs,
      clockRunning: snapshot.clockRunning,
      clockStartedAt: snapshot.clockStartedAt,
      rules: data.rules,
    }),
    [data.rules, snapshot],
  );

  const adoptSnapshot = useCallback((next: ConsoleSnapshot) => {
    setSnapshot(next);
    const serverNow = Date.parse(next.serverNow);
    const nextOffset = Number.isFinite(serverNow) ? serverNow - Date.now() : 0;
    setServerOffsetMs(nextOffset);
  }, []);

  useEffect(() => {
    const update = () => {
      setDisplayElapsedMs(effectiveElapsedMs(runtimeSnapshot, Date.now() + serverOffsetMs));
    };

    update();
    if (!snapshot.clockRunning || finished) return;

    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [finished, runtimeSnapshot, serverOffsetMs, snapshot.clockRunning]);

  async function runAction(action: ConsoleActionName, payload: ConsoleActionPayload = {}) {
    if (pending || finished) return;

    setPending(true);
    setMessage(null);

    try {
      const formData = buildConsoleActionFormData({
        matchId: data.matchId,
        clientActionId: crypto.randomUUID(),
        expectedVersion: snapshot.version,
        action,
        payload,
      });

      const result = await applyConsoleAction(formData);
      if (result.snapshot) adoptSnapshot(result.snapshot);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (action === "finish_match") {
        setMessage("試合を終了しました。最終状態を保存しました。");
      }

      if (RECORD_DOCK_ACTIONS.has(action)) {
        try {
          const nextEvents = await refreshConsoleRecordEvents(data.matchId);
          setRecordEvents(nextEvents);
        } catch {
          setMessage("操作は保存されましたが、記録一覧を更新できませんでした。画面を再読み込みしてください。");
        }
      }
    } catch {
      setMessage("通信に失敗しました。最後に保存された状態は変更していません。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  const shellClassName = focusMode
    ? "fixed inset-0 z-50 overflow-auto bg-primary p-3 text-primary-foreground sm:p-5"
    : "rounded-3xl bg-primary p-3 text-primary-foreground shadow-xl shadow-primary/10 sm:p-5 lg:p-7";

  return (
    <section className={shellClassName} aria-label="MATCH CONSOLE">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.16em] text-primary-foreground/60">MATCH CONSOLE</p>
            <h1 className="mt-1 truncate text-lg font-black sm:text-xl">{data.matchName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-bold">
              {finished ? "終了" : snapshot.matchStatus === "live" ? "LIVE" : "試合前"}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFocusMode((value) => !value)}
            >
              {focusMode ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
              {focusMode ? "通常表示" : "集中表示"}
            </Button>
          </div>
        </header>

        {message ? (
          <div role="status" className="rounded-xl bg-primary-foreground/10 px-4 py-3 text-sm font-semibold">
            {message}
          </div>
        ) : null}

        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_1.15fr_1fr] lg:items-stretch">
          <div className="order-2 flex flex-col justify-between rounded-2xl bg-primary-foreground/8 p-4 text-center lg:order-1">
            <div>
              <p className="truncate text-xs font-bold tracking-wider text-primary-foreground/60">HOME</p>
              <h2 className="mt-2 line-clamp-2 min-h-12 text-base font-bold sm:text-lg">{data.homeName}</h2>
            </div>
            <div className="py-4 text-7xl font-black tabular-nums tracking-tight sm:text-8xl lg:text-9xl">
              {snapshot.homeScore}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={pending || finished}
              onClick={() => runAction("goal", { side: "home" })}
              className="min-h-16 w-full"
            >
              <span className="text-2xl font-black">+1 HOME</span>
            </Button>
          </div>

          <div className="order-1 flex flex-col justify-between rounded-2xl bg-primary-foreground/8 p-4 lg:order-2">
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={pending || finished || snapshot.currentPeriod <= 1}
                onClick={() => runAction("set_period", { period: snapshot.currentPeriod - 1 })}
                aria-label="前のピリオド"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <div className="min-w-28 text-center">
                <p className="text-xs font-bold text-primary-foreground/55">PERIOD</p>
                <p className="mt-1 text-lg font-black">
                  {periodLabel(snapshot.currentPeriod, data.rules.periodCount)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={pending || finished || snapshot.currentPeriod >= maxPeriod}
                onClick={() => runAction("set_period", { period: snapshot.currentPeriod + 1 })}
                aria-label="次のピリオド"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>

            <div className="py-5 text-center">
              <div className="font-mono text-7xl font-black tabular-nums tracking-[-0.06em] sm:text-8xl lg:text-[7.5rem] lg:leading-none">
                {formatClock(displayElapsedMs)}
              </div>
              <p className="mt-3 text-xs font-semibold text-primary-foreground/55">
                {snapshot.clockRunning ? "RUNNING" : finished ? "FINAL" : "STOPPED"}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={pending || finished}
                onClick={() => runAction(snapshot.clockRunning ? "stop_clock" : "start_clock")}
                className="min-h-16"
              >
                {snapshot.clockRunning ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                <span className="text-lg font-black">{snapshot.clockRunning ? "STOP" : "START"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={pending || finished}
                onClick={() => runAction("reset_clock")}
                className="min-h-16"
              >
                <RotateCcw aria-hidden="true" /> RESET
              </Button>
            </div>
          </div>

          <div className="order-3 flex flex-col justify-between rounded-2xl bg-primary-foreground/8 p-4 text-center">
            <div>
              <p className="truncate text-xs font-bold tracking-wider text-primary-foreground/60">AWAY</p>
              <h2 className="mt-2 line-clamp-2 min-h-12 text-base font-bold sm:text-lg">{data.awayName}</h2>
            </div>
            <div className="py-4 text-7xl font-black tabular-nums tracking-tight sm:text-8xl lg:text-9xl">
              {snapshot.awayScore}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={pending || finished}
              onClick={() => runAction("goal", { side: "away" })}
              className="min-h-16 w-full"
            >
              <span className="text-2xl font-black">+1 AWAY</span>
            </Button>
          </div>
        </div>

        <RecordDock
          managedSide={data.managedSide}
          homeName={data.homeName}
          awayName={data.awayName}
          participants={data.participants}
          snapshot={snapshot}
          displayElapsedMs={displayElapsedMs}
          events={recordEvents}
          disabled={pending || finished}
          onAction={runAction}
        />

        <footer className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={pending || finished || (snapshot.homeScore === 0 && snapshot.awayScore === 0)}
            onClick={() => runAction("undo_last_goal")}
          >
            <Undo2 aria-hidden="true" /> 直前ゴールをUndo
          </Button>

          {finished ? (
            <p className="text-sm font-bold text-primary-foreground/70">FINAL · version {snapshot.version}</p>
          ) : confirmFinish ? (
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl bg-primary-foreground/10 p-2">
              <span className="px-2 text-xs font-semibold">このスコアで試合を終了しますか？</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmFinish(false)} disabled={pending}>
                戻る
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => runAction("finish_match")}
              >
                <Flag aria-hidden="true" /> 終了を確定
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirmFinish(true)}>
              <Flag aria-hidden="true" /> 試合を終了
            </Button>
          )}
        </footer>
      </div>
    </section>
  );
}
