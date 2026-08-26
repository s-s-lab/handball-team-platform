"use client";

import { createTeamMember, updateTeamMember } from "@/features/team-core/actions";
import {
  HANDBALL_POSITIONS,
  type TeamMemberKind,
  type TeamMemberRecord,
} from "@/features/team-core/types";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type MemberFormProps = {
  teamId: string;
  member?: TeamMemberRecord;
  error?: string;
};

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20";

export function MemberForm({ teamId, member, error }: MemberFormProps) {
  const isEditing = Boolean(member);
  const action = isEditing ? updateTeamMember : createTeamMember;

  return (
    <form action={action}>
      <input type="hidden" name="teamId" value={teamId} />
      {member ? <input type="hidden" name="memberId" value={member.id} /> : null}

      <FieldGroup>
        {error ? (
          <div
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </div>
        ) : null}

        <Field>
          <FieldLabel htmlFor="member-kind">区分</FieldLabel>
          <select
            id="member-kind"
            name="kind"
            className={selectClassName}
            defaultValue={(member?.kind ?? "player") satisfies TeamMemberKind}
          >
            <option value="player">選手</option>
            <option value="staff">スタッフ</option>
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="member-full-name">氏名</FieldLabel>
          <Input
            id="member-full-name"
            name="fullName"
            defaultValue={member?.fullName ?? ""}
            maxLength={100}
            autoComplete="name"
            placeholder="例：山田 花子"
            required
          />
          <FieldDescription>チーム内部で表示する氏名です。初期状態では一般公開されません。</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="member-display-name">公開表示名</FieldLabel>
          <Input
            id="member-display-name"
            name="displayName"
            defaultValue={member?.displayName ?? ""}
            maxLength={100}
            placeholder="例：Hanako / 山田 H."
          />
          <FieldDescription>
            一般公開をONにする場合は必須です。公開ページではこの表示名だけを使用します。
          </FieldDescription>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="member-shirt-number">背番号</FieldLabel>
            <Input
              id="member-shirt-number"
              name="shirtNumber"
              type="number"
              min={0}
              max={99}
              step={1}
              inputMode="numeric"
              defaultValue={member?.shirtNumber ?? ""}
              placeholder="12"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="member-position">主なポジション</FieldLabel>
            <select
              id="member-position"
              name="primaryPosition"
              className={selectClassName}
              defaultValue={member?.primaryPosition ?? ""}
            >
              <option value="">未設定</option>
              {HANDBALL_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="member-grade-age">学年・年齢</FieldLabel>
          <Input
            id="member-grade-age"
            name="gradeOrAge"
            defaultValue={member?.gradeOrAge ?? ""}
            maxLength={40}
            placeholder="例：高校2年 / U15"
          />
          <FieldDescription>個人情報になり得るため、必要な範囲だけ入力してください。</FieldDescription>
        </Field>

        <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">状態</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={member ? member.isActive : true}
              className="size-5 rounded border-input accent-primary"
            />
            現在のロスターに在籍中
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm font-medium">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={member?.isPublic ?? false}
              className="mt-0.5 size-5 rounded border-input accent-primary"
            />
            <span>
              一般公開する
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                ONにすると公開表示名・背番号・ポジション・学年/年齢がインターネット上で閲覧可能になります。
              </span>
            </span>
          </label>
        </fieldset>

        <PendingSubmitButton
          idleLabel={isEditing ? "変更を保存" : "メンバーを追加"}
          pendingLabel={isEditing ? "保存中…" : "追加中…"}
          className="w-full sm:w-auto"
        />
      </FieldGroup>
    </form>
  );
}
