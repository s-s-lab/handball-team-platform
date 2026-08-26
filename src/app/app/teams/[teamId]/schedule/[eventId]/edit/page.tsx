import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ScheduleForm } from "@/components/schedule/schedule-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteScheduleEvent } from "@/features/schedule/actions";
import { getTeamScheduleEvent } from "@/features/schedule/data";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type EditSchedulePageProps = {
  params: Promise<{ teamId: string; eventId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditSchedulePage({ params, searchParams }: EditSchedulePageProps) {
  const [{ teamId, eventId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || team.role !== "admin") notFound();

  const event = await getTeamScheduleEvent(team.id, eventId);
  if (!event) notFound();
  if (event.linkedMatchId) redirect(`/app/matches/${event.linkedMatchId}`);

  return (
    <main className="max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href={`/app/teams/${team.id}/schedule`}>
          <ArrowLeft aria-hidden="true" /> スケジュールへ戻る
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-muted-foreground">EDIT ACTIVITY</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">予定を編集</h1>
          <p className="mt-2 text-sm text-muted-foreground">{team.name} のチーム予定を更新します。</p>
        </div>
        <form action={deleteScheduleEvent}>
          <input type="hidden" name="teamId" value={team.id} />
          <input type="hidden" name="eventId" value={event.id} />
          <Button type="submit" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 aria-hidden="true" /> 予定を削除
          </Button>
        </form>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle>{event.title}</CardTitle>
          <CardDescription>変更後の内容を保存すると、チームのスケジュールに即時反映されます。</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleForm teamId={team.id} event={event} error={query.error} />
        </CardContent>
      </Card>
    </main>
  );
}
