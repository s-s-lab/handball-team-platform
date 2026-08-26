"use client";

import { useState } from "react";
import { createOrganization } from "@/features/team-core/actions";
import { slugify } from "@/features/team-core/validation";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type OrganizationFormProps = {
  error?: string;
};

export function OrganizationForm({ error }: OrganizationFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form action={createOrganization}>
      <FieldGroup>
        {error ? (
          <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}
        <Field>
          <FieldLabel htmlFor="organization-name">組織名</FieldLabel>
          <Input
            id="organization-name"
            name="name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) setSlug(slugify(nextName));
            }}
            maxLength={80}
            autoComplete="organization"
            placeholder="例：青山ハンドボールクラブ"
            required
          />
          <FieldDescription>クラブ、学校、運営団体など複数チームをまとめる単位です。</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="organization-slug">URL名</FieldLabel>
          <Input
            id="organization-slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
            minLength={2}
            maxLength={60}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="aoyama-handball"
            required
          />
          <FieldDescription>半角英小文字・数字・ハイフンで設定します。あとで公開URLにも利用できます。</FieldDescription>
        </Field>
        <PendingSubmitButton idleLabel="組織を作成" pendingLabel="作成中…" className="w-full sm:w-auto" />
      </FieldGroup>
    </form>
  );
}
