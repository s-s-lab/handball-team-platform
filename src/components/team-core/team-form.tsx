"use client";

import { useState } from "react";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createTeam } from "@/features/team-core/actions";
import { slugify } from "@/features/team-core/validation";

type TeamFormProps = {
  organizationId: string;
  error?: string;
};

export function TeamForm({ organizationId, error }: TeamFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form action={createTeam}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <FieldGroup>
        {error ? (
          <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}
        <Field>
          <FieldLabel htmlFor="team-name">チーム名</FieldLabel>
          <Input
            id="team-name"
            name="name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) setSlug(slugify(nextName));
            }}
            maxLength={80}
            placeholder="例：U18男子"
            required
          />
          <FieldDescription>年代・カテゴリごとに分けて登録できます。</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="team-slug">URL名</FieldLabel>
          <Input
            id="team-slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
            minLength={2}
            maxLength={60}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="u18-boys"
            required
          />
          <FieldDescription>公開ページを有効にしたときのURLにも使います。</FieldDescription>
        </Field>
        <PendingSubmitButton idleLabel="チームを作成" pendingLabel="作成中…" className="w-full sm:w-auto" />
      </FieldGroup>
    </form>
  );
}
