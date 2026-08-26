"use client";

import { createScheduleEvent, updateScheduleEvent } from "@/features/schedule/actions";
import {
  TEAM_EVENT_LABELS,
  TEAM_EVENT_STATUS_LABELS,
  TEAM_EVENT_STATUSES,
  TEAM_EVENT_TYPES,
  type ScheduleEvent,
} from "@/features/schedule/types";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const controlClass = "flex min-h-12 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:text-sm";

function japanLocalInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

type ScheduleFormProps = {
  teamId: string;
  event?: ScheduleEvent;
  error?: string;
};

export function ScheduleForm({ teamId, event, error }: ScheduleFormProps) {
  const action = event ? updateScheduleEvent : createScheduleEvent;

  return (
    <form action={action}>
      <input type="hidden" name="teamId" value={teamId} />
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <FieldGroup>
        {error ? <div role="alert" className="border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</div> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-type">種類</FieldLabel>
            <select id="event-type" name="eventType" className={controlClass} defaultValue={event?.eventType ?? "practice"}>
              {TEAM_EVENT_TYPES.map((type) => <option key={type} value={type}>{TEAM_EVENT_LABELS[type]}</option>)}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="event-status">状態</FieldLabel>
            <select id="event-status" name="status" className={controlClass} defaultValue={event?.status ?? "scheduled"}>
              {TEAM_EVENT_STATUSES.map((status) => <option key={status} value={status}>{TEAM_EVENT_STATUS_LABELS[status]}</option>)}
            </select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="event-title">予定名</FieldLabel>
          <Input id="event-title" name="title" maxLength={120} required defaultValue={event?.title ?? ""} placeholder="例：通常練習 / チームミーティング" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-start">開始</FieldLabel>
            <Input id="event-start" name="startsAt" type="datetime-local" required defaultValue={japanLocalInput(event?.startsAt ?? null)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="event-end">終了</FieldLabel>
            <Input id="event-end" name="endsAt" type="datetime-local" defaultValue={japanLocalInput(event?.endsAt ?? null)} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="event-venue">場所・会場</FieldLabel>
          <Input id="event-venue" name="venue" maxLength={120} defaultValue={event?.venue ?? ""} placeholder="例：青山記念館" />
        </Field>

        <Field>
          <FieldLabel htmlFor="event-memo">メモ</FieldLabel>
          <textarea id="event-memo" name="memo" maxLength={2000} rows={5} className={controlClass} defaultValue={event?.memo ?? ""} placeholder="集合時間、持ち物、連絡事項など" />
          <FieldDescription>チーム内だけで表示されます。一般公開はされません。</FieldDescription>
        </Field>

        <PendingSubmitButton idleLabel={event ? "変更を保存" : "予定を追加"} pendingLabel="保存中…" className="w-full sm:w-auto" />
      </FieldGroup>
    </form>
  );
}
