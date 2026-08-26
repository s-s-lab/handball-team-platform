import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TEAM_EVENT_LABELS,
  type ScheduleEvent,
  type TeamEventType,
} from "@/features/schedule/types";
import {
  buildMonthDays,
  filterScheduleEvents,
  groupEventsByJapanDate,
  upcomingScheduleEvents,
} from "@/features/schedule/runtime";

const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAgendaDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

function eventHref(teamId: string, event: ScheduleEvent, isAdmin: boolean) {
  if (event.linkedMatchId) return `/app/matches/${event.linkedMatchId}`;
  return isAdmin ? `/app/teams/${teamId}/schedule/${event.id}/edit` : null;
}

function EventLine({ teamId, event, isAdmin, compact = false }: { teamId: string; event: ScheduleEvent; isAdmin: boolean; compact?: boolean }) {
  const href = eventHref(teamId, event, isAdmin);
  const content = (
    <div className={`group min-w-0 ${event.status === "cancelled" ? "opacity-50 line-through" : ""}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[10px] font-black tracking-wide text-muted-foreground">{TEAM_EVENT_LABELS[event.eventType]}</span>
        <span className={`${compact ? "text-xs" : "text-sm"} min-w-0 truncate font-bold`}>{event.title}</span>
      </div>
      {!compact ? (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock3 className="size-3" aria-hidden="true" />{formatTime(event.startsAt)}{event.endsAt ? `–${formatTime(event.endsAt)}` : ""}</span>
          {event.venue ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{event.venue}</span> : null}
        </div>
      ) : null}
    </div>
  );

  return href ? <Link href={href} className="block rounded-lg outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : content;
}

function monthHref(year: number, month: number, delta: number, selectedType: TeamEventType | "all") {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const params = new URLSearchParams({
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1),
  });
  if (selectedType !== "all") params.set("type", selectedType);
  return `?${params.toString()}`;
}

type ScheduleBoardProps = {
  teamId: string;
  isAdmin: boolean;
  year: number;
  month: number;
  events: ScheduleEvent[];
  selectedType?: TeamEventType | "all";
  now?: Date;
};

export function ScheduleBoard({ teamId, isAdmin, year, month, events, selectedType = "all", now = new Date() }: ScheduleBoardProps) {
  const filtered = filterScheduleEvents(events, selectedType === "all" ? [] : [selectedType]);
  const grouped = groupEventsByJapanDate(filtered);
  const days = buildMonthDays(year, month);
  const upcoming = upcomingScheduleEvents(filtered, now, 6);
  const typeEntries = Object.entries(TEAM_EVENT_LABELS) as Array<[TeamEventType, string]>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-muted-foreground">TEAM CALENDAR</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] md:text-4xl">スケジュール</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">練習・試合・ミーティングを一か所で管理します。試合として登録した予定は試合情報と自動で同期されます。</p>
        </div>
        {isAdmin ? <Button asChild size="lg"><Link href={`/app/teams/${teamId}/schedule/new`}><Plus aria-hidden="true" />予定を追加</Link></Button> : null}
      </header>

      <nav aria-label="予定の種類" className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={selectedType === "all" ? "default" : "outline"}><Link href={`?year=${year}&month=${month}`}>すべて</Link></Button>
        {typeEntries.map(([type, label]) => (
          <Button key={type} asChild size="sm" variant={selectedType === type ? "default" : "outline"}>
            <Link href={`?year=${year}&month=${month}&type=${type}`}>{label}</Link>
          </Button>
        ))}
      </nav>

      <section aria-labelledby="month-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="icon"><Link href={monthHref(year, month, -1, selectedType)} aria-label="前の月"><ChevronLeft aria-hidden="true" /></Link></Button>
          <h2 id="month-heading" className="text-xl font-black tabular-nums">{year}年 {month}月</h2>
          <Button asChild variant="ghost" size="icon"><Link href={monthHref(year, month, 1, selectedType)} aria-label="次の月"><ChevronRight aria-hidden="true" /></Link></Button>
        </div>

        <div className="hidden overflow-hidden border border-border/80 md:grid md:grid-cols-7">
          {weekdays.map((weekday) => <div key={weekday} className="border-b border-border/80 bg-muted/40 px-2 py-2 text-center text-xs font-black text-muted-foreground">{weekday}</div>)}
          {days.map((day, index) => {
            const dayEvents = grouped.get(day.dateKey) ?? [];
            return (
              <div key={day.dateKey} className={`min-h-32 border-border/70 p-2 ${index % 7 !== 6 ? "border-r" : ""} ${index < 35 ? "border-b" : ""} ${day.inMonth ? "bg-background" : "bg-muted/25 text-muted-foreground"}`}>
                <p className="mb-2 text-xs font-black tabular-nums">{day.day}</p>
                <div className="space-y-2">
                  {dayEvents.slice(0, 3).map((event) => <EventLine key={event.id} teamId={teamId} event={event} isAdmin={isAdmin} compact />)}
                  {dayEvents.length > 3 ? <p className="text-[10px] font-bold text-muted-foreground">+{dayEvents.length - 3}件</p> : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 md:hidden">
          {filtered.length ? filtered.map((event) => (
            <article key={event.id} className="grid grid-cols-[4.5rem_1fr] gap-3 border-b border-border/70 py-4 first:border-t">
              <div>
                <p className="text-xs font-black text-muted-foreground">{formatAgendaDate(event.startsAt)}</p>
                <p className="mt-1 text-sm font-black tabular-nums">{formatTime(event.startsAt)}</p>
              </div>
              <EventLine teamId={teamId} event={event} isAdmin={isAdmin} />
            </article>
          )) : <div className="border-y border-border/70 py-8 text-center text-sm text-muted-foreground">この期間の予定はありません。</div>}
        </div>
      </section>

      <section className="border-t border-border/80 pt-6" aria-labelledby="upcoming-heading">
        <div className="flex items-center gap-2"><CalendarDays className="size-4 text-[var(--workspace-accent)]" aria-hidden="true" /><h2 id="upcoming-heading" className="text-lg font-black">これからの予定</h2></div>
        {upcoming.length ? (
          <div className="mt-4 grid gap-x-8 gap-y-0 lg:grid-cols-2">
            {upcoming.map((event) => <div key={event.id} className="border-b border-border/70 py-4"><p className="mb-2 text-xs font-black text-muted-foreground">{formatAgendaDate(event.startsAt)}</p><EventLine teamId={teamId} event={event} isAdmin={isAdmin} /></div>)}
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">今後の予定はありません。</p>}
      </section>
    </div>
  );
}
