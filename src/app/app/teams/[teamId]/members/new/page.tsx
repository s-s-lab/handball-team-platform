import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTeamForCurrentUser } from "@/features/team-core/data";
import { MemberForm } from "@/components/team-core/member-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type NewMemberPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewMemberPage({ params, searchParams }: NewMemberPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || team.role !== "admin") notFound();

  return (
    <main className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href={`/app/teams/${team.id}`}>
          <ArrowLeft aria-hidden="true" /> チームへ戻る
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>メンバーを追加</CardTitle>
          <CardDescription>
            {team.name} の選手・スタッフを登録します。個人情報は初期状態では一般公開されません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm teamId={team.id} error={query.error} />
        </CardContent>
      </Card>
    </main>
  );
}
