import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardPlus, MapPin, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classifyMatchResult, scoreForTeam, splitTeamMatches } from "@/features/match-results/runtime";
import type { TeamMatchResultItem } from "@/features/match-results/types";

type MatchResultsBoardProps = {
  teamId: string;
  teamName: string;
  matches: TeamMatchResultItem[];
  isAdmin: boolean;
};

function formatJapanDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function outcomeLabel(match: TeamMatchResultItem) {
  const outcome = classifyMatchResult(match);
  if (outcome === "win") return "WIN";
  if (outcome === "loss") return "LOSS";
  return "DRAW";
}

function outcomeClassName(match: TeamMatchResultItem) {
  const outcome = classifyMatchResult(match);
  if (outcome === "win") return "text-[var(--workspace-accent)]";
  if (outcome === "loss") return "text-muted-foreground";
  return "text-foreground";
}

function UpcomingMatchRow({ match }: { match: TeamMatchResultItem }) {
  return (
    <Link
      href={`/app/matches/${match.id}`}
      className="group grid gap-4 border-t border-border/80 py-5 first:border-t-0 first:pt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black tracking-[0.12em] text-muted-foreground">
          {match.status === "live" ? (
            <span className="text-[var(--workspace-live)]">LIVE</span>
          ) : (
            <span>UPCOMING</span>
          )}
          {match.seasonName ? <span>{match.seasonName} SEASON</span> : null}
          {match.competitionName ? <span>{match.competitionName}</span> : null}
        </div>
        <p className="mt-2 truncate text-xl font-black tracking-tight">vs {match.opponentName}</p>
        <p className="mt-1 truncate text-sm font-medium text-muted-foreground">{match.name}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatJapanDateTime(match.scheduledAt)}
          </span>
          {match.venue ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              {match.venue}
            </span>
          ) : null}
        </div>
      </div>
      <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}

function ResultMatchRow({ match }: { match: TeamMatchResultItem }) {
  const score = scoreForTeam(match);
  return (
    <Link
      href={`/app/matches/${match.id}`}
      className="group grid gap-5 border-t border-border/80 py-5 first:border-t-0 first:pt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black tracking-[0.12em] text-muted-foreground">
          <span className={outcomeClassName(match)}>{outcomeLabel(match)}</span>
          {match.seasonName ? <span>{match.seasonName} SEASON</span> : null}
          {match.competitionName ? <span>{match.competitionName}</span> : null}
          <span>{match.resultSource === "manual" ? "MANUAL" : "MATCH CONSOLE"}</span>
        </div>
        <p className="mt-2 truncate text-xl font-black tracking-tight">vs {match.opponentName}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{match.name}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{formatJapanDateTime(match.scheduledAt)}</span>
          {match.venue ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              {match.venue}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-5 md:justify-end">
        <div className="text-right">
          <p className="text-[11px] font-black tracking-[0.18em] text-muted-foreground">FINAL</p>
          <p className="mt-1 text-4xl font-black tabular-nums tracking-[-0.05em] md:text-5xl">
            {score.team}
            <span className="px-2 text-2xl text-muted-foreground">-</span>
            {score.opponent}
          </p>
        </div>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </Link>
  );
}

export function MatchResultsBoard({ teamId, teamName, matches, isAdmin }: MatchResultsBoardProps) {
  const { upcoming, results, cancelled } = splitTeamMatches(matches);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden bg-[var(--workspace-ink)] px-5 py-6 text-white md:px-8 md:py-8">
        <div
          className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(120deg,transparent,var(--workspace-accent-soft))] opacity-40"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-white/55">{teamName} / MATCHES</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">試合</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              これからの試合と終了した試合を同じ場所で管理します。Match Consoleで記録した結果も、後から登録した過去結果もここに集約されます。
            </p>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="bg-[var(--workspace-accent)] text-[var(--workspace-ink)] hover:opacity-90">
                <Link href={`/app/teams/${teamId}/matches/new`}>
                  <Plus aria-hidden="true" /> 試合を作成
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href={`/app/teams/${teamId}/matches/history/new`}>
                  <ClipboardPlus aria-hidden="true" /> 過去の結果を登録
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="upcoming-matches-heading">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-border/80 pb-3">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">UPCOMING</p>
            <h2 id="upcoming-matches-heading" className="mt-1 text-2xl font-black tracking-tight">これから</h2>
          </div>
          <span className="text-sm font-black tabular-nums text-muted-foreground">{upcoming.length}</span>
        </div>

        {upcoming.length > 0 ? (
          <div>{upcoming.map((match) => <UpcomingMatchRow key={match.id} match={match} />)}</div>
        ) : (
          <div className="py-8">
            <p className="font-black">予定されている試合はありません。</p>
            <p className="mt-1 text-sm text-muted-foreground">試合または公式戦の予定を追加すると、ここに表示されます。</p>
          </div>
        )}
      </section>

      <section aria-labelledby="match-results-heading">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-border/80 pb-3">
          <div className="flex items-end gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">RESULTS</p>
              <h2 id="match-results-heading" className="mt-1 text-2xl font-black tracking-tight">結果</h2>
            </div>
            <Trophy className="mb-1 size-5 text-[var(--workspace-accent)]" aria-hidden="true" />
          </div>
          <span className="text-sm font-black tabular-nums text-muted-foreground">{results.length}</span>
        </div>

        {results.length > 0 ? (
          <div>{results.map((match) => <ResultMatchRow key={match.id} match={match} />)}</div>
        ) : (
          <div className="py-8">
            <p className="font-black">記録された試合結果はまだありません。</p>
            <p className="mt-1 text-sm text-muted-foreground">試合終了または過去結果の登録後、最終スコアがここに表示されます。</p>
          </div>
        )}
      </section>

      {cancelled.length > 0 ? (
        <section aria-labelledby="cancelled-matches-heading" className="border-t border-border/80 pt-5">
          <h2 id="cancelled-matches-heading" className="text-xs font-black tracking-[0.16em] text-muted-foreground">CANCELLED</h2>
          <div className="mt-3 divide-y divide-border/70">
            {cancelled.map((match) => (
              <Link key={match.id} href={`/app/matches/${match.id}`} className="flex items-center justify-between gap-3 py-3 text-sm font-bold">
                <span>vs {match.opponentName}</span>
                <span className="text-xs text-muted-foreground">{formatJapanDateTime(match.scheduledAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
