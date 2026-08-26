import { notFound } from "next/navigation";
import { ScheduleBoard } from "@/components/schedule/schedule-board";
import { getTeamForCurrentUser } from "@/features/team-core/data";
import { listTeamScheduleEvents } from "@/features/schedule/data";
import { buildMonthDays } from "@/features/schedule/runtime";
import { TEAM_EVENT_TYPES, type TeamEventType } from "@/features/schedule/types";

type SchedulePageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ year?: string; month?: string; type?: string; error?: string }>;
};

function currentJapanYearMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month") };
}

function addJapanDays(dateKey: string, days: number) {
  const base = new Date(`${dateKey}T00:00:00+09:00`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

export default async function SchedulePage({ params, searchParams }: SchedulePageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || !team.role) notFound();

  const current = currentJapanYearMonth();
  const parsedYear = Number(query.year);
  const parsedMonth = Number(query.month);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : current.year;
  const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : current.month;
  const selectedType = TEAM_EVENT_TYPES.includes(query.type as TeamEventType) ? (query.type as TeamEventType) : "all";

  const days = buildMonthDays(year, month);
  const fromIso = new Date(`${days[0]!.dateKey}T00:00:00+09:00`).toISOString();
  const toIso = addJapanDays(days[41]!.dateKey, 1);
  const events = await listTeamScheduleEvents(team.id, fromIso, toIso);

  return (
    <main className="space-y-5">
      {query.error ? <div role="alert" className="border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{query.error}</div> : null}
      <ScheduleBoard teamId={team.id} isAdmin={team.role === "admin"} year={year} month={month} events={events} selectedType={selectedType} />
    </main>
  );
}
