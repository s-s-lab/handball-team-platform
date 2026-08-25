import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { saveMatchRoster } from "@/features/matches/actions";
import type { MatchRosterCandidate, MatchRosterSelection } from "@/features/matches/types";

type MatchRosterFormProps = {
  selection: MatchRosterSelection;
  error?: string;
};

function CandidateRow({ candidate, selected }: { candidate: MatchRosterCandidate; selected: boolean }) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/50">
      <input
        type="checkbox"
        name="teamMemberId"
        value={candidate.id}
        defaultChecked={selected}
        className="size-5 shrink-0 rounded border-input accent-primary"
      />
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-sm font-black text-foreground">
        {candidate.shirtNumber ?? "–"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">{candidate.fullName}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {candidate.kind === "player" ? "選手" : "スタッフ"}
          {candidate.primaryPosition ? ` · ${candidate.primaryPosition}` : ""}
        </span>
      </span>
    </label>
  );
}

export function MatchRosterForm({ selection, error }: MatchRosterFormProps) {
  const selected = new Set(selection.selectedIds);
  const players = selection.candidates.filter((member) => member.kind === "player");
  const staff = selection.candidates.filter((member) => member.kind === "staff");

  return (
    <form action={saveMatchRoster} className="flex flex-col gap-6">
      <input type="hidden" name="matchId" value={selection.matchId} />

      {error ? (
        <div
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
        {selection.hasConfiguredRoster
          ? "前回保存したロスターを選択状態として表示しています。"
          : "初回設定のため、在籍中のメンバーを全員選択しています。不要なメンバーのチェックを外してください。"}
        <span className="mt-1 block">
          保存時点の氏名・背番号・ポジションを試合ロスターとしてスナップショット保存します。
        </span>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold">選手</h2>
          <p className="mt-1 text-xs text-muted-foreground">{players.length}名が在籍中です。</p>
        </div>
        {players.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {players.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} selected={selected.has(candidate.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            在籍中の選手がいません。
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold">スタッフ</h2>
          <p className="mt-1 text-xs text-muted-foreground">{staff.length}名が在籍中です。</p>
        </div>
        {staff.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {staff.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} selected={selected.has(candidate.id)} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            在籍中のスタッフがいません。
          </p>
        )}
      </section>

      <div className="sticky bottom-4 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <PendingSubmitButton
          idleLabel="ロスターを保存"
          pendingLabel="保存中…"
          className="w-full sm:w-auto"
        />
      </div>
    </form>
  );
}
