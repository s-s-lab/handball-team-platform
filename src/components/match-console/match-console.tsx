"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  refreshConsoleSnapshot,
} from "@/features/match-console/actions";
import { effectiveElapsedMs, formatClock } from "@/features/match-console/runtime";
import type {
  ConsoleActionName,
  ConsoleActionPayload,
  ConsoleParticipant,
  ConsoleSnapshot,
  MatchConsoleData,
} from "@/features/match-console/types";
import {
  clearOfflineMatchData,
  loadOfflineEvents,
  loadOfflineParticipants,
  loadOfflineSnapshot,
  loadPendingActions,
  saveOfflineEvents,
  saveOfflineParticipants,
  saveOfflineSnapshot,
  savePendingActions,
} from "@/features/offline-match/idb";
import { buildQueueItem } from "@/features/offline-match/queue";
import { applyLocalAction } from "@/features/offline-match/reducer";
import {
  advanceReplayQueue,
  buildReplayPlan,
  rebaseReplayQueue,
} from "@/features/offline-match/sync";
import type {
  OfflineMatchState,
  OfflineQueueItem,
} from "@/features/offline-match/types";
import type { RecordEvent } from "@/features/match-records/types";
import { ConflictPanel } from "./conflict-panel";
import { RecordDock } from "./record-dock";
import { SyncStatus, type MatchConsoleSyncStatus } from "./sync-status";

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
  const [participants, setParticipants] = useState(data.participants);
  const [pendingQueue, setPendingQueue] = useState<OfflineQueueItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<MatchConsoleSyncStatus>("saved");
  const [conflictServerSnapshot, setConflictServerSnapshot] = useState<ConsoleSnapshot | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(() => {
    const serverNow = Date.parse(data.snapshot.serverNow);
    return Number.isFinite(serverNow) ? serverNow - Date.now() : 0;
  });
  const [displayElapsedMs, setDisplayElapsedMs] = useState(data.snapshot.clockElapsedMs);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const snapshotRef = useRef(data.snapshot);
  const acceptedSnapshotRef = useRef(data.snapshot);
  const eventsRef = useRef(data.recordEvents);
  const participantsRef = useRef(data.participants);
  const queueRef = useRef<OfflineQueueItem[]>([]);
  const nextLocalSequenceRef = useRef(1);
  const syncingRef = useRef(false);

  const maxPeriod =
    data.rules.periodCount +
    (data.rules.overtimeEnabled ? data.rules.overtimePeriodCount : 0);
  const finished = snapshot.matchStatus === "finished" || snapshot.matchStatus === "cancelled";
  const controlsDisabled =
    pending || finished || syncStatus === "conflict" || syncStatus === "syncing";

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

  const adoptVisibleSnapshot = useCallback((next: ConsoleSnapshot) => {
    snapshotRef.current = next;
    setSnapshot(next);
    const serverNow = Date.parse(next.serverNow);
    const nextOffset = Number.isFinite(serverNow) ? serverNow - Date.now() : 0;
    setServerOffsetMs(nextOffset);
  }, []);

  const adoptAuthoritativeSnapshot = useCallback((next: ConsoleSnapshot) => {
    acceptedSnapshotRef.current = next;
    adoptVisibleSnapshot(next);
  }, [adoptVisibleSnapshot]);

  const updateEvents = useCallback((next: RecordEvent[]) => {
    eventsRef.current = next;
    setRecordEvents(next);
  }, []);

  const updateParticipants = useCallback((next: ConsoleParticipant[]) => {
    participantsRef.current = next;
    setParticipants(next);
  }, []);

  const updateQueue = useCallback((next: OfflineQueueItem[]) => {
    queueRef.current = next;
    setPendingQueue(next);
  }, []);

  const persistOfflineState = useCallback(async (
    acceptedServerSnapshot: ConsoleSnapshot,
    optimisticSnapshot: ConsoleSnapshot,
    events: RecordEvent[],
    queue: OfflineQueueItem[],
    nextLocalSequence: number,
  ) => {
    await Promise.all([
      saveOfflineSnapshot(data.matchId, {
        acceptedServerSnapshot,
        optimisticSnapshot,
        rules: data.rules,
        managedSide: data.managedSide,
        nextLocalSequence,
      }),
      saveOfflineEvents(data.matchId, events),
      saveOfflineParticipants(data.matchId, participantsRef.current),
      savePendingActions(data.matchId, queue),
    ]);
  }, [data.managedSide, data.matchId, data.rules]);

  const replayPending = useCallback(async (
    queue: OfflineQueueItem[],
    localSnapshot: ConsoleSnapshot,
    localEvents: RecordEvent[],
    nextLocalSequence: number,
  ) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setPending(true);

    try {
      const serverSnapshot = await refreshConsoleSnapshot(data.matchId);
      if (!serverSnapshot) {
        setSyncStatus("offline");
        setMessage("サーバー状態を確認できませんでした。未同期操作は端末に保持しています。");
        return;
      }

      if (!queue.length) {
        adoptAuthoritativeSnapshot(serverSnapshot);
        nextLocalSequenceRef.current = 1;
        await persistOfflineState(serverSnapshot, serverSnapshot, localEvents, [], 1);
        setSyncStatus("saved");
        return;
      }

      const plan = buildReplayPlan(serverSnapshot.version, queue);
      if (plan.state === "conflict") {
        acceptedSnapshotRef.current = serverSnapshot;
        setConflictServerSnapshot(serverSnapshot);
        setSyncStatus("conflict");
        setMessage("別の端末で試合状態が更新されています。自動同期を停止しました。");
        await persistOfflineState(serverSnapshot, localSnapshot, localEvents, queue, nextLocalSequence);
        return;
      }

      if (plan.state === "empty") {
        adoptAuthoritativeSnapshot(serverSnapshot);
        updateQueue([]);
        nextLocalSequenceRef.current = 1;
        setSyncStatus("saved");
        return;
      }

      setSyncStatus("syncing");
      let authoritative = serverSnapshot;
      let remaining = [...queue].sort((a, b) => a.localSequence - b.localSequence);

      for (const step of plan.steps) {
        const formData = buildConsoleActionFormData({
          matchId: step.item.matchId,
          clientActionId: step.item.clientActionId,
          expectedVersion: authoritative.version,
          action: step.item.action,
          payload: step.item.payload,
        });

        let result;
        try {
          result = await applyConsoleAction(formData);
        } catch {
          const rebased = rebaseReplayQueue(remaining, authoritative.version);
          updateQueue(rebased);
          await persistOfflineState(authoritative, localSnapshot, localEvents, rebased, nextLocalSequence);
          adoptVisibleSnapshot(localSnapshot);
          setSyncStatus("offline");
          setMessage("同期途中で通信が切れました。残りの操作は端末に保持しています。");
          return;
        }

        if (!result.ok) {
          authoritative = result.snapshot ?? authoritative;
          acceptedSnapshotRef.current = authoritative;
          const failed = rebaseReplayQueue(
            advanceReplayQueue(remaining, step.item.clientActionId, "failed"),
            authoritative.version,
          );
          updateQueue(failed);
          setConflictServerSnapshot(authoritative);
          adoptVisibleSnapshot(localSnapshot);
          await persistOfflineState(authoritative, localSnapshot, localEvents, failed, nextLocalSequence);
          setSyncStatus("conflict");
          setMessage(`未同期操作をサーバーが受理できませんでした。${result.message}`);
          return;
        }

        authoritative = result.snapshot;
        acceptedSnapshotRef.current = authoritative;
        remaining = rebaseReplayQueue(
          advanceReplayQueue(remaining, step.item.clientActionId, "accepted"),
          authoritative.version,
        );
        updateQueue(remaining);
        adoptVisibleSnapshot(authoritative);
        await persistOfflineState(authoritative, localSnapshot, localEvents, remaining, nextLocalSequence);
      }

      let nextEvents = localEvents;
      try {
        nextEvents = await refreshConsoleRecordEvents(data.matchId);
        updateEvents(nextEvents);
      } catch {
        setMessage("未同期操作は保存されましたが、記録一覧の再読込に失敗しました。");
      }

      updateQueue([]);
      nextLocalSequenceRef.current = 1;
      setConflictServerSnapshot(null);
      adoptAuthoritativeSnapshot(authoritative);
      await persistOfflineState(authoritative, authoritative, nextEvents, [], 1);
      setSyncStatus("saved");
    } catch {
      setSyncStatus("offline");
      setMessage("再接続に失敗しました。未同期操作は端末に保持しています。");
    } finally {
      syncingRef.current = false;
      setPending(false);
    }
  }, [adoptAuthoritativeSnapshot, adoptVisibleSnapshot, data.matchId, persistOfflineState, updateEvents, updateQueue]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [cached, cachedEvents, cachedParticipants, queued] = await Promise.all([
          loadOfflineSnapshot(data.matchId),
          loadOfflineEvents(data.matchId),
          loadOfflineParticipants(data.matchId),
          loadPendingActions(data.matchId),
        ]);
        if (cancelled) return;

        if (cached && queued.length) {
          acceptedSnapshotRef.current = cached.acceptedServerSnapshot;
          adoptVisibleSnapshot(cached.optimisticSnapshot);
          nextLocalSequenceRef.current = cached.nextLocalSequence;
          updateQueue(queued);
          if (cachedEvents.length) updateEvents(cachedEvents);
          if (cachedParticipants.length) updateParticipants(cachedParticipants);

          if (navigator.onLine) {
            void replayPending(
              queued,
              cached.optimisticSnapshot,
              cachedEvents.length ? cachedEvents : eventsRef.current,
              cached.nextLocalSequence,
            );
          } else {
            setSyncStatus("offline");
          }
          return;
        }

        await persistOfflineState(data.snapshot, data.snapshot, data.recordEvents, [], 1);
        if (!navigator.onLine) setSyncStatus("offline");
      } catch {
        if (!cancelled) {
          setMessage("オフライン保存領域を初期化できませんでした。オンライン操作は継続できます。");
        }
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [adoptVisibleSnapshot, data.matchId, data.recordEvents, data.snapshot, persistOfflineState, replayPending, updateEvents, updateParticipants, updateQueue]);

  useEffect(() => {
    const handleOffline = () => {
      setSyncStatus("offline");
    };
    const handleOnline = () => {
      void replayPending(
        queueRef.current,
        snapshotRef.current,
        eventsRef.current,
        nextLocalSequenceRef.current,
      );
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [replayPending]);

  useEffect(() => {
    const update = () => {
      setDisplayElapsedMs(effectiveElapsedMs(runtimeSnapshot, Date.now() + serverOffsetMs));
    };

    update();
    if (!snapshot.clockRunning || finished) return;

    const interval = window.setInterval(update, 100);
    return () => window.clearInterval(interval);
  }, [finished, runtimeSnapshot, serverOffsetMs, snapshot.clockRunning]);

  async function saveOfflineAction(
    action: ConsoleActionName,
    payload: ConsoleActionPayload,
    clientActionId: string,
  ) {
    const offlineState: OfflineMatchState = {
      snapshot: snapshotRef.current,
      rules: data.rules,
      managedSide: data.managedSide,
      events: eventsRef.current,
      nextLocalSequence: nextLocalSequenceRef.current,
    };
    const localResult = applyLocalAction(offlineState, { action, payload, clientActionId }, Date.now());
    if (!localResult.ok) {
      setMessage(localResult.message);
      return false;
    }

    const eventTime = {
      period: localResult.event.period ?? localResult.state.snapshot.currentPeriod,
      periodElapsedMs: localResult.event.periodElapsedMs ?? localResult.state.snapshot.clockElapsedMs,
      competitionElapsedMs:
        localResult.event.competitionElapsedMs ?? localResult.state.snapshot.competitionElapsedMs,
    };
    const queued = buildQueueItem({
      matchId: data.matchId,
      clientActionId,
      action,
      payload,
      baseServerVersion: acceptedSnapshotRef.current.version,
      eventTime,
      enqueuedAt: new Date().toISOString(),
    }, queueRef.current);

    if (!queued.ok) {
      setMessage(queued.message);
      return false;
    }

    const nextQueue = [...queueRef.current, queued.item].sort((a, b) => a.localSequence - b.localSequence);
    try {
      await persistOfflineState(
        acceptedSnapshotRef.current,
        localResult.state.snapshot,
        localResult.state.events,
        nextQueue,
        localResult.state.nextLocalSequence,
      );
    } catch {
      setMessage("オフライン操作を端末へ保存できませんでした。操作は反映していません。");
      return false;
    }

    nextLocalSequenceRef.current = localResult.state.nextLocalSequence;
    updateQueue(nextQueue);
    updateEvents(localResult.state.events);
    adoptVisibleSnapshot(localResult.state.snapshot);
    setSyncStatus("offline");
    setMessage("オフラインで操作を保存しました。接続復帰後に自動同期します。");
    return true;
  }

  async function runAction(action: ConsoleActionName, payload: ConsoleActionPayload = {}) {
    if (controlsDisabled) return;

    setPending(true);
    setMessage(null);
    const clientActionId = crypto.randomUUID();

    try {
      if (!navigator.onLine) {
        await saveOfflineAction(action, payload, clientActionId);
        return;
      }

      if (queueRef.current.length) {
        setMessage("未同期操作を先に同期します。同期後にもう一度操作してください。");
        await replayPending(
          queueRef.current,
          snapshotRef.current,
          eventsRef.current,
          nextLocalSequenceRef.current,
        );
        return;
      }

      setSyncStatus("saving");
      const formData = buildConsoleActionFormData({
        matchId: data.matchId,
        clientActionId,
        expectedVersion: acceptedSnapshotRef.current.version,
        action,
        payload,
      });

      let result;
      try {
        result = await applyConsoleAction(formData);
      } catch {
        await saveOfflineAction(action, payload, clientActionId);
        return;
      }

      if (result.snapshot) adoptAuthoritativeSnapshot(result.snapshot);
      if (!result.ok) {
        setSyncStatus("saved");
        setMessage(result.message);
        if (result.snapshot) {
          nextLocalSequenceRef.current = 1;
          await persistOfflineState(result.snapshot, result.snapshot, eventsRef.current, [], 1);
        }
        return;
      }

      let nextEvents = eventsRef.current;
      if (RECORD_DOCK_ACTIONS.has(action)) {
        try {
          nextEvents = await refreshConsoleRecordEvents(data.matchId);
          updateEvents(nextEvents);
        } catch {
          setMessage("操作は保存されましたが、記録一覧を更新できませんでした。画面を再読み込みしてください。");
        }
      }

      nextLocalSequenceRef.current = 1;
      await persistOfflineState(result.snapshot, result.snapshot, nextEvents, [], 1);
      setSyncStatus("saved");
      if (action === "finish_match") {
        setMessage("試合を終了しました。最終状態を保存しました。");
      }
    } catch {
      setSyncStatus(queueRef.current.length ? "offline" : "saved");
      setMessage("操作処理中にエラーが発生しました。保存状態を確認してください。");
    } finally {
      setPending(false);
    }
  }

  async function discardLocalConflict() {
    if (!conflictServerSnapshot || pending) return;
    setPending(true);
    try {
      const latest = (await refreshConsoleSnapshot(data.matchId)) ?? conflictServerSnapshot;
      let nextEvents: RecordEvent[] = [];
      try {
        nextEvents = await refreshConsoleRecordEvents(data.matchId);
      } catch {
        nextEvents = eventsRef.current.filter((event) => !event.id.startsWith("local-"));
      }
      await clearOfflineMatchData(data.matchId);
      acceptedSnapshotRef.current = latest;
      nextLocalSequenceRef.current = 1;
      updateQueue([]);
      updateEvents(nextEvents);
      adoptAuthoritativeSnapshot(latest);
      await persistOfflineState(latest, latest, nextEvents, [], 1);
      setConflictServerSnapshot(null);
      setSyncStatus("saved");
      setMessage("ローカル未同期操作を破棄し、最新のサーバー状態へ戻しました。");
    } catch {
      setMessage("サーバー状態へ戻せませんでした。通信状態を確認して再度お試しください。");
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SyncStatus status={syncStatus} pendingCount={pendingQueue.length} />
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

        {syncStatus === "conflict" && conflictServerSnapshot ? (
          <ConflictPanel
            serverSnapshot={conflictServerSnapshot}
            localSnapshot={snapshot}
            pendingCount={pendingQueue.length}
            onDiscardLocal={discardLocalConflict}
          />
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
              disabled={controlsDisabled}
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
                disabled={controlsDisabled || snapshot.currentPeriod <= 1}
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
                disabled={controlsDisabled || snapshot.currentPeriod >= maxPeriod}
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
                disabled={controlsDisabled}
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
                disabled={controlsDisabled}
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
              disabled={controlsDisabled}
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
          participants={participants}
          snapshot={snapshot}
          displayElapsedMs={displayElapsedMs}
          events={recordEvents}
          disabled={controlsDisabled}
          onAction={runAction}
        />

        <footer className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={controlsDisabled || (snapshot.homeScore === 0 && snapshot.awayScore === 0)}
            onClick={() => runAction("undo_last_goal")}
          >
            <Undo2 aria-hidden="true" /> 直前ゴールをUndo
          </Button>

          {finished ? (
            <p className="text-sm font-bold text-primary-foreground/70">FINAL · version {snapshot.version}</p>
          ) : confirmFinish ? (
            <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl bg-primary-foreground/10 p-2">
              <span className="px-2 text-xs font-semibold">このスコアで試合を終了しますか？</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmFinish(false)} disabled={controlsDisabled}>
                戻る
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={controlsDisabled}
                onClick={() => runAction("finish_match")}
              >
                <Flag aria-hidden="true" /> 終了を確定
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" disabled={controlsDisabled} onClick={() => setConfirmFinish(true)}>
              <Flag aria-hidden="true" /> 試合を終了
            </Button>
          )}
        </footer>
      </div>
    </section>
  );
}
