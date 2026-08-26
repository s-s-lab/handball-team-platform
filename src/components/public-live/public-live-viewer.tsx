"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Wifi, WifiOff } from "lucide-react";
import { getPublicLiveMatch } from "@/features/public-live/data";
import {
  effectivePublicElapsedMs,
  formatPublicClock,
} from "@/features/public-live/runtime";
import type { PublicLiveMatch } from "@/features/public-live/types";
import { createPublicClient } from "@/lib/supabase/public-client";

type ConnectionState = "connecting" | "connected" | "reconnecting";

const LIVE_RECONCILE_INTERVAL_MS = 3_000;

function periodLabel(currentPeriod: number, periodCount: number) {
  if (periodCount === 2 && currentPeriod === 1) return "前半";
  if (periodCount === 2 && currentPeriod === 2) return "後半";
  if (currentPeriod <= periodCount) return `第${currentPeriod}ピリオド`;
  return `延長${currentPeriod - periodCount}`;
}

function formatScheduledAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function connectionLabel(state: ConnectionState) {
  if (state === "connected") return "リアルタイム接続中";
  if (state === "reconnecting") return "再接続中";
  return "接続中";
}

function statusLabel(status: PublicLiveMatch["status"]) {
  if (status === "live") return "LIVE";
  if (status === "finished") return "FINAL";
  if (status === "cancelled") return "中止";
  return "試合前";
}

export function PublicLiveViewer({ initialMatch }: { initialMatch: PublicLiveMatch }) {
  const [match, setMatch] = useState(initialMatch);
  const [displayElapsedMs, setDisplayElapsedMs] = useState(initialMatch.state.clockElapsedMs);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const serverOffsetMsRef = useRef(0);
  const refreshInFlightRef = useRef(false);

  const teamIsHome = match.teamSide === "home";
  const homeName = teamIsHome ? match.teamName : match.opponentName;
  const awayName = teamIsHome ? match.opponentName : match.teamName;
  const finished = match.status === "finished" || match.status === "cancelled";

  useEffect(() => {
    const serverNow = Date.parse(match.serverNow);
    serverOffsetMsRef.current = Number.isFinite(serverNow) ? serverNow - Date.now() : 0;

    const updateClock = () => {
      setDisplayElapsedMs(
        effectivePublicElapsedMs(match, Date.now() + serverOffsetMsRef.current),
      );
    };

    updateClock();
    if (!match.state.clockRunning || finished) return;

    const interval = window.setInterval(updateClock, 250);
    return () => window.clearInterval(interval);
  }, [finished, match]);

  useEffect(() => {
    const refreshMatch = async () => {
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;

      try {
        const refreshed = await getPublicLiveMatch(initialMatch.matchId);
        if (!refreshed) {
          setRefreshMessage("最新状態を取得できませんでした。接続を維持して再試行します。");
          return;
        }

        setRefreshMessage(null);
        setMatch((current) =>
          refreshed.state.version >= current.state.version ? refreshed : current,
        );
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const supabase = createPublicClient();
    const channel = supabase
      .channel(`match:${initialMatch.matchId}:live`)
      .on("broadcast", { event: "state_changed" }, () => {
        void refreshMatch();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("connected");
          void refreshMatch();
          return;
        }
        if (status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
          setConnectionState("reconnecting");
          return;
        }
        setConnectionState("connecting");
      });

    const reconcileInterval = window.setInterval(() => {
      void refreshMatch();
    }, LIVE_RECONCILE_INTERVAL_MS);

    const handleOnline = () => {
      void refreshMatch();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshMatch();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(reconcileInterval);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [initialMatch.matchId]);

  const connectionIcon =
    connectionState === "connected" ? (
      <Wifi className="size-4" aria-hidden="true" />
    ) : connectionState === "reconnecting" ? (
      <WifiOff className="size-4" aria-hidden="true" />
    ) : (
      <Radio className="size-4" aria-hidden="true" />
    );

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-12" aria-label="公開LIVEスコア">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{match.matchName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatScheduledAt(match.scheduledAt)}
            {match.venue ? ` ・ ${match.venue}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              match.status === "live"
                ? "rounded-full bg-destructive px-3 py-1.5 text-xs font-black tracking-wider text-destructive-foreground"
                : "rounded-full bg-muted px-3 py-1.5 text-xs font-black tracking-wider text-foreground"
            }
          >
            {statusLabel(match.status)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {connectionIcon}
            {connectionLabel(connectionState)}
          </span>
        </div>
      </div>

      {refreshMessage ? (
        <div role="status" className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {refreshMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl shadow-primary/10">
        <div className="border-b border-primary-foreground/10 px-4 py-5 text-center sm:px-6">
          <p className="text-xs font-bold tracking-[0.16em] text-primary-foreground/55">PERIOD</p>
          <p className="mt-1 text-xl font-black">
            {periodLabel(match.state.currentPeriod, match.rules.periodCount)}
          </p>
          <p
            className="mt-3 text-5xl font-black tabular-nums tracking-tight sm:text-6xl md:text-7xl"
            aria-live="polite"
          >
            {formatPublicClock(displayElapsedMs)}
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-primary-foreground/10">
          <div className="min-w-0 px-4 py-7 text-center sm:px-8 sm:py-10">
            <p className="text-xs font-bold tracking-wider text-primary-foreground/55">HOME</p>
            <h1 className="mt-2 line-clamp-2 min-h-12 text-base font-bold sm:text-xl md:text-2xl">
              {homeName}
            </h1>
            <p
              className="mt-5 text-7xl font-black tabular-nums tracking-tight sm:text-8xl md:text-9xl"
              aria-live="polite"
            >
              {match.state.homeScore}
            </p>
          </div>

          <div className="min-w-0 px-4 py-7 text-center sm:px-8 sm:py-10">
            <p className="text-xs font-bold tracking-wider text-primary-foreground/55">AWAY</p>
            <h2 className="mt-2 line-clamp-2 min-h-12 text-base font-bold sm:text-xl md:text-2xl">
              {awayName}
            </h2>
            <p
              className="mt-5 text-7xl font-black tabular-nums tracking-tight sm:text-8xl md:text-9xl"
              aria-live="polite"
            >
              {match.state.awayScore}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
        スコアと時計は大会運営・チームが入力した最新の公開情報を表示しています。
      </p>
    </section>
  );
}
