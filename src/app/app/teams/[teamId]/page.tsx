import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { TeamDashboard } from "@/components/team-dashboard/team-dashboard";
import { RosterList } from "@/components/team-core/roster-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeamDashboardSummary } from "@/features/team-dashboard/data";
import { buildDashboardSummary } from "@/features/team-dashboard/runtime";
import { updateTeamVisibility } from "@/features/team-core/actions";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team) notFound();

  const isAdmin = team.role === "admin";
  const activeMemberCount = team.roster.filter((member) => member.isActive).length;
  const summary = team.role
    ? await getTeamDashboardSummary(team.id, activeMemberCount)
    : buildDashboardSummary({
        now: new Date(),
        activeMemberCount,
        matches: [],
        scorers: [],
      });

  return (
    <main className="flex flex-col gap-8">
      {query.error ? (
        <div
          role="alert"
          className="border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {query.error}
        </div>
      ) : null}

      <TeamDashboard
        team={{
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          slug: team.slug,
          description: team.description,
          isPublic: team.isPublic,
        }}
        isAdmin={isAdmin}
        summary={summary}
      />

      <section className="border-t border-border/80 pt-6" aria-labelledby="team-members-heading">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">ROSTER</p>
            <h2 id="team-members-heading" className="mt-1 text-2xl font-black tracking-tight">メンバー</h2>
          </div>
          <p className="text-sm text-muted-foreground">登録済みメンバーを確認・更新できます。</p>
        </div>
        <RosterList teamId={team.id} roster={team.roster} isAdmin={isAdmin} />
      </section>

      <Card className="border-border/80 shadow-none">
        <CardHeader>
          <CardTitle>公開設定</CardTitle>
          <CardDescription>
            チームを公開しても、各メンバーは個別に公開をONにしない限り公開されません。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{team.isPublic ? "一般公開中" : "非公開"}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {team.isPublic
                ? "公開ページからチーム情報と公開許可済みメンバーを閲覧できます。"
                : "現在、一般ユーザーからこのチームは閲覧できません。"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {team.isPublic ? (
              <Button asChild variant="outline">
                <Link href={`/teams/${team.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" /> 公開ページを見る
                </Link>
              </Button>
            ) : null}

            {isAdmin ? (
              <form action={updateTeamVisibility}>
                <input type="hidden" name="teamId" value={team.id} />
                <input type="hidden" name="isPublic" value={team.isPublic ? "" : "on"} />
                <PendingSubmitButton
                  idleLabel={team.isPublic ? "公開を停止" : "チームを公開"}
                  pendingLabel="更新中…"
                />
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
