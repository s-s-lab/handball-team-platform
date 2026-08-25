import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { safeNextPath } from "@/lib/auth/routes";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card>
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
            <CardDescription>所属チームの管理画面とMATCH CONSOLEにアクセスします。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login}>
              <input type="hidden" name="next" value={next} />
              <FieldGroup>
                {params.error ? <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{params.error}</div> : null}
                <Field>
                  <FieldLabel htmlFor="email">メールアドレス</FieldLabel>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">パスワード</FieldLabel>
                  <Input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
                </Field>
                <Button type="submit" size="lg" className="w-full">ログイン</Button>
                <FieldDescription className="text-center">アカウントをお持ちでない方は <Link className="font-semibold text-foreground underline underline-offset-4" href="/signup">新規登録</Link></FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <div className="mt-6 text-center"><Button asChild variant="ghost" size="sm"><Link href="/">公開トップへ戻る</Link></Button></div>
      </div>
    </main>
  );
}
