import Link from "next/link";
import { ArrowRight, Building2, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMyOrganizations, listMyTeams } from "@/features/team-core/data";

export default async function AppHomePage() {
  const [organizations, teams] = await Promise.all([
    listMyOrganizations(),
    listMyTeams(),
  ]);

  const hasOrganizations = organizations.length > 0;

  return (
    <main>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-muted-foreground">ホーム</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">チーム運営</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
            所属する組織とチームをまとめて確認できます。まず組織を作り、その中にチームとロスターを登録します。
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/app/organizations/new"><Plus aria-hidden="true" /> 組織を作成</Link>
        </Button>
      </div>

      {!hasOrganizations ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>最初の組織を作成</CardTitle>
            <CardDescription>
              クラブ・学校・運営団体など、複数チームをまとめる単位です。あとから複数のチームを追加できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/app/organizations/new">組織を作成 <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <section aria-labelledby="organizations-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="organizations-heading" className="text-xl font-bold">組織</h2>
                <p className="mt-1 text-sm text-muted-foreground">所属しているOrganization</p>
              </div>
              <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              {organizations.map((organization) => (
                <Link
                  key={organization.id}
                  href={`/app/organizations/${organization.id}`}
                  className="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{organization.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{organization.role === "admin" ? "管理者" : "メンバー"}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="teams-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="teams-heading" className="text-xl font-bold">チーム</h2>
                <p className="mt-1 text-sm text-muted-foreground">直接所属しているTeam</p>
              </div>
              <UsersRound className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            {teams.length > 0 ? (
              <div className="space-y-3">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/app/teams/${team.id}`}
                    className="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{team.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{team.role === "admin" ? "管理者" : "メンバー"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{team.isPublic ? "公開" : "非公開"}</span>
                      </div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    まだ直接所属しているチームはありません。組織を開いてチームを作成してください。
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
