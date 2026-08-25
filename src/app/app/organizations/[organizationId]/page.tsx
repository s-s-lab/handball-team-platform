import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationForCurrentUser } from "@/features/team-core/data";

type OrganizationPageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const { organizationId } = await params;
  const organization = await getOrganizationForCurrentUser(organizationId);
  if (!organization) notFound();

  return (
    <main>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href="/app"><ArrowLeft aria-hidden="true" /> ホームへ戻る</Link>
      </Button>

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{organization.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            あなたの権限：{organization.role === "admin" ? "管理者" : "メンバー"}
          </p>
        </div>
        {organization.role === "admin" ? (
          <Button asChild size="lg">
            <Link href={`/app/organizations/${organization.id}/teams/new`}><Plus aria-hidden="true" /> チームを作成</Link>
          </Button>
        ) : null}
      </div>

      <section className="mt-8" aria-labelledby="organization-teams-heading">
        <h2 id="organization-teams-heading" className="text-xl font-bold">チーム</h2>
        <p className="mt-1 text-sm text-muted-foreground">この組織に登録されているチームです。</p>

        {organization.teams.length > 0 ? (
          <div className="mt-4 space-y-3">
            {organization.teams.map((team) => (
              <Link
                key={team.id}
                href={`/app/teams/${team.id}`}
                className="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{team.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{team.isPublic ? "公開" : "非公開"}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>まだチームがありません</CardTitle>
              <CardDescription>管理者は、この組織の最初のチームを作成できます。</CardDescription>
            </CardHeader>
            {organization.role === "admin" ? (
              <CardContent>
                <Button asChild>
                  <Link href={`/app/organizations/${organization.id}/teams/new`}>チームを作成</Link>
                </Button>
              </CardContent>
            ) : null}
          </Card>
        )}
      </section>
    </main>
  );
}
