import Link from "next/link";
import { Activity, CalendarClock, ChevronRight, Trophy } from "lucide-react";
import { sortPublicMatchSummaries } from "@/features/public-live/runtime";
import type { PublicMatchSummary } from "@/features/public-live/types";

function formatScheduledAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function teamScore(match: PublicMatchSummary) {
  return match.teamSide === "home" ? match.homeScore : match.awayScore;
}

function opponentScore(match: PublicMatchSummary) {
  return match.teamSide === "home" ? match.awayScore : match.homeScore;
}

function MatchRow({ match, live = false }: { match: PublicMatchSummary; live?: boolean }) {
  const finished = match.status === "finished";
  const cancelled = match.status === "cancelled";

  return (
    <Link
      href={`/live/${match.matchId}`}
      className="group flex items-center gap-4 border-b border-border/70 px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/40 sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <span className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black tracking-wider text-destructive-foreground">
              LIVE
            </span>
          ) : null}
          {cancelled ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              中止
            </span>
          ) : null}
          <span className="text-xs font-semibold text-muted-foreground">
            {match.teamSide === "home" ? "HOME" : "AWAY"}
          </span>
        </div>
        <p className="mt-1.5 truncate font-bold text-foreground">vs {match.opponentName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatScheduledAt(match.scheduledAt)}
          {match.venue ? ` ・ ${match.venue}` : ""}
        </p>
      </div>

      {live || finished ? (
        <div className="shrink-0 text-right">
          <p className="text-2xl font-black tabular-nums tracking-tight text-foreground">
            {teamScore(match)} <span className="text-muted-foreground">-</span> {opponentScore(match)}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
            {live ? "現在のスコア" : "最終スコア"}
          </p>
        </div>
      ) : null}

      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export function PublicMatchList({
  matches,
  nowMs,
}: {
  matches: PublicMatchSummary[];
  nowMs: number;
}) {
  const ordered = sortPublicMatchSummaries(matches, nowMs);
  const live = ordered.filter((match) => match.status === "live");
  const scheduled = ordered.filter((match) => match.status === "scheduled");
  const recent = ordered.filter(
    (match) => match.status === "finished" || match.status === "cancelled",
  );

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        現在公開されている試合情報はありません。
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {live.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Activity className="size-4 text-destructive" aria-hidden="true" />
            <h3 className="text-sm font-black text-foreground">LIVE</h3>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {live.map((match) => (
              <MatchRow key={match.matchId} match={match} live />
            ))}
          </div>
        </section>
      ) : null}

      {scheduled.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-black text-foreground">今後の試合</h3>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {scheduled.map((match) => (
              <MatchRow key={match.matchId} match={match} />
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-black text-foreground">最近の結果</h3>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {recent.slice(0, 8).map((match) => (
              <MatchRow key={match.matchId} match={match} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
