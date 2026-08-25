import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TeamForm } from "@/components/team-core/team-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationForCurrentUser } from "@/features/team-core/data";

type NewTeamPageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewTeamPage({ params, searchParams }: NewTeamPageProps) {
  const [{ organizationId }, query] = await Promise.all([params, searchParams]);
  const organization = await getOrganizationForCurrentUser(organizationId);
  if (!organization || organization.role !== "admin") notFound();

  return (
    <main className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href={`/app/organizations/${organization.id}`}><ArrowLeft aria-hidden="true" /> {organization.name}へ戻る</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>チームを作成</CardTitle>
          <CardDescription>
            {organization.name} に新しいチームを追加します。作成したユーザーがチーム管理者になります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamForm organizationId={organization.id} error={query.error} />
        </CardContent>
      </Card>
    </main>
  );
}
