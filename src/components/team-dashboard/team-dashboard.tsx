import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Plus,
  Target,
  Trophy,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  classifyTeamResult,
  type DashboardMatch,
  type TeamDashboardSummary,
} from "@/features/team-dashboard/runtime";
import { TEAM_EVENT_LABELS, type ScheduleEvent } from "@/features/schedule/types";

type TeamDashboardProps = {
  team: {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    description: string | null;
    isPublic: boolean;
  };
  isAdmin: boolean;
  summary: TeamDashboardSummary;
  nextActivity?: ScheduleEvent | null;
};

function formatJapanDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function scoreForTeam(match: DashboardMatch) {
  return match.teamSide === "home"
    ? { team: match.homeScore, opponent: match.awayScore }
    : { team: match.awayScore, opponent: match.homeScore };
}

function resultLabel(match: DashboardMatch) {
  const result = classifyTeamResult(match);
  if (result === "win") return "WIN";
  if (result === "loss") return "LOSS";
  return "DRAW";
}

export function NextEventCard({
  teamId,
  event,
  match,
}: {
  teamId?: string;
  event?: ScheduleEvent | null;
  match: DashboardMatch | null;
}) {
  if (event) {
    const href = event.linkedMatchId
      ? `/app/matches/${event.linkedMatchId}`
      : `/app/teams/${teamId ?? event.teamId}/schedule`;
    return (
      <section className="border-t border-border/80 pt-5" aria-labelledby="next-event-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-[var(--workspace-accent)]" aria-hidden="true" />
            <h2 id="next-event-heading" className="text-sm font-black tracking-wide">次の予定</h2>
          </div>
          <span className="text-xs font-black tracking-[0.14em] text-muted-foreground">
            {TEAM_EVENT_LABELS[event.eventType]}
          </span>
        </div>
        <Link href={href} className="group mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="text-xs font-bold text-muted-foreground">{formatJapanDateTime(event.startsAt)}</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xl font-black tracking-tight">{event.title}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{TEAM_EVENT_LABELS[event.eventType]}</p>
            </div>
            <ArrowRight className="mb-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
          {event.venue ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" /> {event.venue}
            </p>
          ) : null}
        </Link>
      </section>
    );
  }

  return (
    <section className="border-t border-border/80 pt-5" aria-labelledby="next-match-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[var(--workspace-accent)]" aria-hidden="true" />
          <h2 id="next-match-heading" className="text-sm font-black tracking-wide">次の試合</h2>
        </div>
        {match?.status === "live" ? (
          <span className="text-xs font-black tracking-[0.16em] text-[var(--workspace-live)]">LIVE</span>
        ) : null}
      </div>

      {match ? (
        <Link
          href={`/app/matches/${match.id}`}
          className="group mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-xs font-bold text-muted-foreground">{formatJapanDateTime(match.scheduledAt)}</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xl font-black tracking-tight">vs {match.opponentName}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{match.name}</p>
            </div>
            <ArrowRight className="mb-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
          {match.venue ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden="true" /> {match.venue}
            </p>
          ) : null}
        </Link>
      ) : (
        <div className="mt-4 py-5">
          <p className="font-bold">予定されている試合はありません。</p>
          <p className="mt-1 text-sm text-muted-foreground">試合を登録すると、ここに次の予定が表示されます。</p>
        </div>
      )}
    </section>
  );
}

export function RecentResultCard({ match }: { match: DashboardMatch | null }) {
  if (!match) {
    return (
      <section className="border-t border-border/80 pt-5" aria-labelledby="recent-result-heading">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="recent-result-heading" className="text-sm font-black tracking-wide">直近の結果</h2>
        </div>
        <div className="mt-4 py-5">
          <p className="font-bold">終了した試合はまだありません。</p>
          <p className="mt-1 text-sm text-muted-foreground">試合終了後、スコアがここに反映されます。</p>
        </div>
      </section>
    );
  }

  const score = scoreForTeam(match);
  return (
    <section className="border-t border-border/80 pt-5" aria-labelledby="recent-result-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="recent-result-heading" className="text-sm font-black tracking-wide">直近の結果</h2>
        </div>
        <span className="text-xs font-black tracking-[0.14em] text-muted-foreground">{resultLabel(match)}</span>
      </div>
      <Link href={`/app/matches/${match.id}`} className="group mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <p className="text-xs font-bold text-muted-foreground">{formatJapanDateTime(match.scheduledAt)}</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-black">vs {match.opponentName}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{match.name}</p>
          </div>
          <p className="shrink-0 text-4xl font-black tabular-nums tracking-[-0.05em]">
            {score.team}<span className="px-1.5 text-xl text-muted-foreground">-</span>{score.opponent}
          </p>
        </div>
      </Link>
    </section>
  );
}

export function SeasonSummaryCard({ summary }: { summary: TeamDashboardSummary }) {
  return (
    <section className="border-t border-border/80 pt-5" aria-labelledby="season-summary-heading">
      <h2 id="season-summary-heading" className="text-xs font-black tracking-[0.15em] text-muted-foreground">記録済み戦績</h2>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-black tabular-nums tracking-[-0.05em]">{summary.record.wins}</span>
        <span className="text-sm font-black">勝</span>
        <span className="ml-2 text-2xl font-black tabular-nums">{summary.record.draws}</span>
        <span className="text-xs font-bold text-muted-foreground">分</span>
        <span className="ml-1 text-2xl font-black tabular-nums">{summary.record.losses}</span>
        <span className="text-xs font-bold text-muted-foreground">敗</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">終了済み {summary.record.played} 試合を集計</p>
    </section>
  );
}

export function ScoringLeaders({ summary }: { summary: TeamDashboardSummary }) {
  return (
    <section className="border-t border-border/80 pt-5" aria-labelledby="scoring-leaders-heading">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-[var(--workspace-accent)]" aria-hidden="true" />
        <h2 id="scoring-leaders-heading" className="text-sm font-black tracking-wide">得点ランキング</h2>
      </div>
      {summary.topScorers.length > 0 ? (
        <ol className="mt-4 divide-y divide-border/70">
          {summary.topScorers.map((player, index) => (
            <li key={player.teamMemberId ?? `${player.shirtNumber}-${player.displayName}`} className="flex items-center gap-3 py-3 first:pt-0">
              <span className="w-5 text-sm font-black text-muted-foreground">{index + 1}</span>
              <div className="grid size-9 place-items-center border border-border bg-muted/50 text-xs font-black">
                {player.shirtNumber ?? "–"}
              </div>
              <p className="min-w-0 flex-1 truncate font-bold">{player.displayName}</p>
              <p className="text-xl font-black tabular-nums">{player.goals}<span className="ml-1 text-xs text-muted-foreground">GOALS</span></p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 py-5">
          <p className="font-bold">得点記録はまだありません。</p>
          <p className="mt-1 text-sm text-muted-foreground">試合コンソールで記録した得点者が自動で反映されます。</p>
        </div>
      )}
    </section>
  );
}

export function TeamDashboard({ team, isAdmin, summary, nextActivity }: TeamDashboardProps) {
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden bg-[var(--workspace-ink)] px-5 py-6 text-white md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(120deg,transparent,var(--workspace-accent-soft))] opacity-35" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-xs font-black tracking-[0.18em] text-white/60">
              <span>{team.shortName ?? "TEAM"}</span>
              <span aria-hidden="true">/</span>
              <span>{team.isPublic ? "PUBLIC" : "PRIVATE"}</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">{team.name}</h1>
            {team.description ? <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">{team.description}</p> : null}
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="bg-[var(--workspace-accent)] text-[var(--workspace-ink)] hover:opacity-90">
                <Link href={`/app/teams/${team.id}/schedule/new`}><Plus aria-hidden="true" /> 予定を追加</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href={`/app/teams/${team.id}/matches/new`}><CalendarDays aria-hidden="true" /> 試合を作成</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-2">
        <NextEventCard teamId={team.id} event={nextActivity} match={summary.nextMatch} />
        <RecentResultCard match={summary.latestResult} />
      </div>

      <div className="grid gap-7 md:grid-cols-3">
        <SeasonSummaryCard summary={summary} />
        <section className="border-t border-border/80 pt-5" aria-labelledby="member-count-heading">
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="member-count-heading" className="text-xs font-black tracking-[0.15em] text-muted-foreground">ACTIVE MEMBERS</h2>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black tabular-nums tracking-[-0.05em]">{summary.activeMemberCount}</span>
            <span className="text-sm font-bold text-muted-foreground">名</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">現在アクティブな選手・スタッフ</p>
        </section>
        <section className="border-t border-border/80 pt-5" aria-labelledby="top-scorer-heading">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 id="top-scorer-heading" className="text-xs font-black tracking-[0.15em] text-muted-foreground">TOP SCORER</h2>
          </div>
          {summary.topScorers[0] ? (
            <>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums tracking-[-0.05em]">{summary.topScorers[0].goals}</span>
                <span className="text-sm font-bold text-muted-foreground">GOALS</span>
              </div>
              <p className="mt-2 text-sm font-bold">{summary.topScorers[0].displayName}</p>
            </>
          ) : (
            <p className="mt-3 text-sm font-bold text-muted-foreground">記録なし</p>
          )}
        </section>
      </div>

      <ScoringLeaders summary={summary} />

      {isAdmin ? (
        <section className="flex flex-col gap-4 border-y border-border/80 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black">チーム運営を更新</p>
            <p className="mt-1 text-sm text-muted-foreground">予定・試合・メンバーをここからすぐ追加できます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`/app/teams/${team.id}/schedule/new`}><Plus aria-hidden="true" /> 予定</Link></Button>
            <Button asChild variant="outline"><Link href={`/app/teams/${team.id}/matches/new`}><CalendarDays aria-hidden="true" /> 試合</Link></Button>
            <Button asChild variant="outline"><Link href={`/app/teams/${team.id}/members/new`}><UserPlus aria-hidden="true" /> メンバー</Link></Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
