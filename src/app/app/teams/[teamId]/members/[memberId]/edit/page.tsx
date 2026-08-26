import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTeamForCurrentUser } from "@/features/team-core/data";
import { MemberForm } from "@/components/team-core/member-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EditMemberPageProps = {
  params: Promise<{ teamId: string; memberId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditMemberPage({ params, searchParams }: EditMemberPageProps) {
  const [{ teamId, memberId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || team.role !== "admin") notFound();

  const member = team.roster.find((entry) => entry.id === memberId);
  if (!member) notFound();

  return (
    <main className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href={`/app/teams/${team.id}/members/${member.id}`}>
          <ArrowLeft aria-hidden="true" /> プロフィールへ戻る
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>メンバーを編集</CardTitle>
          <CardDescription>
            公開設定を変更する場合は、公開表示名と公開される項目を確認してから保存してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm teamId={team.id} member={member} error={query.error} />
        </CardContent>
      </Card>
    </main>
  );
}
