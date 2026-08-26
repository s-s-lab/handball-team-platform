import { ClipboardCheck } from "lucide-react";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createManualMatchResult } from "@/features/match-results/actions";

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20";

const textareaClassName =
  "flex min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20";

type ManualMatchResultFormProps = {
  teamId: string;
  error?: string;
};

export function ManualMatchResultForm({ teamId, error }: ManualMatchResultFormProps) {
  return (
    <form action={createManualMatchResult} className="space-y-7">
      <input type="hidden" name="teamId" value={teamId} />

      <section className="border-b border-border/80 pb-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center bg-[var(--workspace-accent-soft)] text-[var(--workspace-ink)]">
            <ClipboardCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">HISTORICAL RESULT</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">過去の結果を登録</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              過去のスコアシートや記録から試合結果を追加できます。得点者や退場などの詳細ログが残っていなくても、最終スコアだけでも登録できます。
            </p>
          </div>
        </div>
      </section>

      <FieldGroup>
        {error ? (
          <div
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="manual-result-competition">大会・リーグ名</FieldLabel>
            <Input
              id="manual-result-competition"
              name="competitionName"
              maxLength={120}
              placeholder="例：関東学生リーグ"
            />
            <FieldDescription>大会名が分からない場合は空欄でも登録できます。</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="manual-result-name">試合名</FieldLabel>
            <Input
              id="manual-result-name"
              name="name"
              maxLength={100}
              placeholder="例：秋季リーグ 第2節"
              required
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="manual-result-opponent">対戦相手</FieldLabel>
            <Input
              id="manual-result-opponent"
              name="opponentName"
              maxLength={100}
              placeholder="例：横浜HC"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="manual-result-side">自チーム</FieldLabel>
            <select
              id="manual-result-side"
              name="teamSide"
              className={selectClassName}
              defaultValue="home"
            >
              <option value="home">HOME</option>
              <option value="away">AWAY</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="manual-result-date">試合日時</FieldLabel>
            <Input id="manual-result-date" name="scheduledAt" type="datetime-local" required />
            <FieldDescription>日本時間で入力してください。</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="manual-result-venue">会場</FieldLabel>
            <Input
              id="manual-result-venue"
              name="venue"
              maxLength={120}
              placeholder="例：横浜体育館"
            />
          </Field>
        </div>

        <fieldset className="border-y border-border/80 py-6">
          <legend className="px-1 text-xs font-black tracking-[0.16em] text-muted-foreground">
            FINAL SCORE
          </legend>
          <div className="mt-2 grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <Field>
              <FieldLabel htmlFor="manual-result-team-score">自チーム得点</FieldLabel>
              <Input
                id="manual-result-team-score"
                name="teamScore"
                type="number"
                min={0}
                max={199}
                step={1}
                inputMode="numeric"
                className="h-20 text-center text-4xl font-black tabular-nums"
                placeholder="0"
                required
              />
            </Field>

            <span className="hidden pb-4 text-2xl font-black text-muted-foreground sm:block" aria-hidden="true">
              –
            </span>

            <Field>
              <FieldLabel htmlFor="manual-result-opponent-score">相手得点</FieldLabel>
              <Input
                id="manual-result-opponent-score"
                name="opponentScore"
                type="number"
                min={0}
                max={199}
                step={1}
                inputMode="numeric"
                className="h-20 text-center text-4xl font-black tabular-nums"
                placeholder="0"
                required
              />
            </Field>
          </div>
        </fieldset>

        <Field>
          <FieldLabel htmlFor="manual-result-memo">メモ</FieldLabel>
          <textarea
            id="manual-result-memo"
            name="memo"
            maxLength={2000}
            className={textareaClassName}
            placeholder="大会ラウンド、補足事項、記録元など"
          />
        </Field>

        <fieldset className="border-t border-border/80 pt-5">
          <legend className="px-1 text-sm font-black">公開設定</legend>
          <label className="mt-2 flex min-h-11 items-start gap-3 text-sm font-medium">
            <input type="checkbox" name="isPublic" className="mt-0.5 size-5 rounded border-input accent-primary" />
            <span>
              公開対象にする
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                チームの公開ページにこの試合結果を掲載する場合にONにします。
              </span>
            </span>
          </label>
        </fieldset>

        <PendingSubmitButton
          idleLabel="試合結果を登録"
          pendingLabel="登録中…"
          className="w-full sm:w-auto"
        />
      </FieldGroup>
    </form>
  );
}
