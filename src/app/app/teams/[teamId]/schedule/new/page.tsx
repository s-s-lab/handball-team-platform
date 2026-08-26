import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ScheduleForm } from "@/components/schedule/schedule-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type NewSchedulePageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewSchedulePage({ params, searchParams }: NewSchedulePageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || team.role !== "admin") notFound();

  return (
    <main className="max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href={`/app/teams/${team.id}/schedule`}>
          <ArrowLeft aria-hidden="true" /> スケジュールへ戻る
        </Link>
      </Button>

      <div className="mb-6">
        <p className="text-xs font-black tracking-[0.18em] text-muted-foreground">NEW ACTIVITY</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">予定を追加</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {team.name} の練習・ミーティングなどを登録します。試合は試合画面から作成するとスケジュールへ自動反映されます。
        </p>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle>予定の内容</CardTitle>
          <CardDescription>チーム内で共有する日時・場所・連絡事項を入力してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleForm teamId={team.id} error={query.error} />
        </CardContent>
      </Card>
    </main>
  );
}
