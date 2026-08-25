import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createMatch } from "@/features/matches/actions";

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20";

const textareaClassName =
  "flex min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20";

type MatchFormProps = {
  teamId: string;
  error?: string;
};

export function MatchForm({ teamId, error }: MatchFormProps) {
  return (
    <form action={createMatch}>
      <input type="hidden" name="teamId" value={teamId} />

      <FieldGroup>
        {error ? (
          <div
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="match-name">試合名</FieldLabel>
            <Input
              id="match-name"
              name="name"
              maxLength={100}
              placeholder="例：関東リーグ 第3節"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="match-opponent">対戦相手</FieldLabel>
            <Input
              id="match-opponent"
              name="opponentName"
              maxLength={100}
              placeholder="例：○○クラブ"
              required
            />
            <FieldDescription>相手チームがこのサービスを使っていなくても登録できます。</FieldDescription>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="match-side">自チーム</FieldLabel>
            <select id="match-side" name="teamSide" className={selectClassName} defaultValue="home">
              <option value="home">HOME</option>
              <option value="away">AWAY</option>
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="match-scheduled-at">試合日時</FieldLabel>
            <Input id="match-scheduled-at" name="scheduledAt" type="datetime-local" required />
            <FieldDescription>日本時間で入力してください。</FieldDescription>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="match-venue">会場</FieldLabel>
          <Input id="match-venue" name="venue" maxLength={120} placeholder="例：○○市総合体育館" />
        </Field>

        <Field>
          <FieldLabel htmlFor="match-memo">メモ</FieldLabel>
          <textarea
            id="match-memo"
            name="memo"
            maxLength={2000}
            className={textareaClassName}
            placeholder="集合時刻、ユニフォーム、連絡事項など"
          />
        </Field>

        <fieldset className="flex flex-col gap-5 rounded-2xl border border-border p-5">
          <legend className="px-1 text-base font-bold">試合ルール</legend>
          <p className="text-sm leading-6 text-muted-foreground">
            標準ルールを初期値にしています。大会区分や年代に合わせて試合ごとに変更できます。
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="period-count">ピリオド数</FieldLabel>
              <Input id="period-count" name="periodCount" type="number" min={1} max={4} step={1} defaultValue={2} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="period-minutes">1ピリオド（分）</FieldLabel>
              <Input id="period-minutes" name="periodMinutes" type="number" min={1} max={60} step={1} defaultValue={30} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="halftime-minutes">ハーフタイム（分）</FieldLabel>
              <Input id="halftime-minutes" name="halftimeMinutes" type="number" min={0} max={30} step={1} defaultValue={10} required />
            </Field>
          </div>

          <label className="flex min-h-11 items-start gap-3 text-sm font-medium">
            <input type="checkbox" name="overtimeEnabled" className="mt-0.5 size-5 rounded border-input accent-primary" />
            <span>
              延長戦を使用する
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                同点時に延長へ進む大会の場合にONにしてください。
              </span>
            </span>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="overtime-period-count">延長ピリオド数</FieldLabel>
              <Input id="overtime-period-count" name="overtimePeriodCount" type="number" min={1} max={4} step={1} defaultValue={2} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="overtime-period-minutes">延長1ピリオド（分）</FieldLabel>
              <Input id="overtime-period-minutes" name="overtimePeriodMinutes" type="number" min={1} max={30} step={1} defaultValue={5} required />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="timeouts-game">TTO / 試合</FieldLabel>
              <Input id="timeouts-game" name="teamTimeoutsPerGame" type="number" min={0} max={3} step={1} defaultValue={2} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="timeouts-period">TTO / ピリオド</FieldLabel>
              <Input id="timeouts-period" name="teamTimeoutsPerPeriod" type="number" min={0} max={2} step={1} defaultValue={1} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="timeout-seconds">TTO時間（秒）</FieldLabel>
              <Input id="timeout-seconds" name="teamTimeoutSeconds" type="number" min={30} max={120} step={1} defaultValue={60} required />
            </Field>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">公開設定</legend>
          <label className="flex min-h-11 items-start gap-3 text-sm font-medium">
            <input type="checkbox" name="isPublic" className="mt-0.5 size-5 rounded border-input accent-primary" />
            <span>
              公開対象にする
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                公開試合・LIVE表示は後続フェーズで接続します。この設定自体は試合ごとに保存されます。
              </span>
            </span>
          </label>
        </fieldset>

        <PendingSubmitButton
          idleLabel="試合を作成してロスターを設定"
          pendingLabel="作成中…"
          className="w-full sm:w-auto"
        />
      </FieldGroup>
    </form>
  );
}
