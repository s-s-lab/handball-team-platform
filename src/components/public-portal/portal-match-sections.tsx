import Link from "next/link";
import { Activity, CalendarClock, ChevronRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupPublicPortalMatches } from "@/features/public-portal/data-shaping";
import type { PublicPortalMatch } from "@/features/public-portal/types";

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTimeFormatter.format(parsed);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
}

function teamScore(match: PublicPortalMatch) {
  return match.teamSide === "home" ? match.homeScore : match.awayScore;
}

function opponentScore(match: PublicPortalMatch) {
  return match.teamSide === "home" ? match.awayScore : match.homeScore;
}

function MatchRow({ match }: { match: PublicPortalMatch }) {
  const live = match.status === "live";
  const finished = match.status === "finished";

  return (
    <article className="border-b border-border/70 px-4 py-4 last:border-b-0 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {live ? (
              <span className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black tracking-wider text-destructive-foreground">
                LIVE
              </span>
            ) : null}
            <span className="text-xs font-bold tracking-wide text-muted-foreground">
              {match.teamSide === "home" ? "HOME" : "AWAY"}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <Link
              href={`/teams/${match.teamSlug}`}
              className="w-fit font-bold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {match.teamName}
            </Link>
            <p className="text-sm text-muted-foreground">vs {match.opponentName}</p>
          </div>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {finished ? formatDate(match.scheduledAt) : formatDateTime(match.scheduledAt)}
            {match.venue ? ` ・ ${match.venue}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
          {live || finished ? (
            <div className="min-w-24 text-left sm:text-right">
              <p className="text-3xl font-black tabular-nums tracking-tight text-foreground">
                {teamScore(match)} <span className="text-muted-foreground">-</span> {opponentScore(match)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                {live ? "現在のスコア" : "最終スコア"}
              </p>
            </div>
          ) : null}

          <Button asChild variant="outline" size="sm">
            <Link href={`/live/${match.matchId}`}>
              試合を見る
              <ChevronRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function MatchGroup({
  icon: Icon,
  title,
  matches,
  emptyText,
  live = false,
}: {
  icon: typeof Activity;
  title: string;
  matches: PublicPortalMatch[];
  emptyText: string;
  live?: boolean;
}) {
  return (
    <section aria-labelledby={`portal-${title}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={live ? "size-4 text-destructive" : "size-4 text-muted-foreground"} aria-hidden="true" />
        <h3 id={`portal-${title}`} className="text-sm font-black text-foreground">
          {title}
        </h3>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {matches.length > 0 ? (
          matches.map((match) => <MatchRow key={match.matchId} match={match} />)
        ) : (
          <p className="px-5 py-6 text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export function PortalMatchSections({ matches }: { matches: PublicPortalMatch[] }) {
  const grouped = groupPublicPortalMatches(matches);

  return (
    <div className="flex flex-col gap-8">
      <MatchGroup
        icon={Activity}
        title="LIVE"
        matches={grouped.live}
        emptyText="現在LIVE公開中の試合はありません。"
        live
      />
      <MatchGroup
        icon={CalendarClock}
        title="今後の試合"
        matches={grouped.scheduled}
        emptyText="現在公開されている今後の試合はありません。"
      />
      <MatchGroup
        icon={Trophy}
        title="最近の結果"
        matches={grouped.finished}
        emptyText="最近公開された試合結果はありません。"
      />
    </div>
  );
}
