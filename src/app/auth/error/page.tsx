import Link from "next/link";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card>
          <CardHeader><CardTitle>認証を完了できませんでした</CardTitle><CardDescription>確認リンクの有効期限が切れているか、すでに使用されている可能性があります。</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3"><Button asChild><Link href="/login">ログインへ</Link></Button><Button asChild variant="outline"><Link href="/signup">アカウントを作り直す</Link></Button></CardContent>
        </Card>
      </div>
    </main>
  );
}
