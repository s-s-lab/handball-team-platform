import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OrganizationForm } from "@/components/team-core/organization-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type NewOrganizationPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewOrganizationPage({ searchParams }: NewOrganizationPageProps) {
  const params = await searchParams;

  return (
    <main className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href="/app"><ArrowLeft aria-hidden="true" /> ホームへ戻る</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>組織を作成</CardTitle>
          <CardDescription>
            チームをまとめる運営単位を作成します。作成したユーザーが最初の管理者になります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm error={params.error} />
        </CardContent>
      </Card>
    </main>
  );
}
