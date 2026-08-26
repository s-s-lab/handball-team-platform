create type public.team_event_type as enum (
  'practice',
  'official_match',
  'friendly',
  'meeting',
  'other'
);

create type public.team_event_status as enum (
  'scheduled',
  'completed',
  'cancelled'
);

create table public.team_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  linked_match_id uuid references public.matches(id) on delete set null,
  event_type public.team_event_type not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text check (venue is null or char_length(venue) <= 120),
  memo text check (memo is null or char_length(memo) <= 2000),
  status public.team_event_status not null default 'scheduled',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_events_end_after_start check (ends_at is null or ends_at >= starts_at)
);

create index team_events_team_starts_idx
  on public.team_events(team_id, starts_at);
create index team_events_team_type_starts_idx
  on public.team_events(team_id, event_type, starts_at);
create unique index team_events_linked_match_unique_idx
  on public.team_events(linked_match_id)
  where linked_match_id is not null;

create trigger team_events_set_updated_at
before update on public.team_events
for each row execute function public.set_updated_at();

alter table public.team_events enable row level security;

create policy team_events_select_team_member
on public.team_events for select
to authenticated
using (private.is_team_member(team_id));

create policy team_events_insert_team_admin
on public.team_events for insert
to authenticated
with check (private.is_team_admin(team_id));

create policy team_events_update_team_admin
on public.team_events for update
to authenticated
using (private.is_team_admin(team_id))
with check (private.is_team_admin(team_id));

create policy team_events_delete_team_admin
on public.team_events for delete
to authenticated
using (private.is_team_admin(team_id));

revoke all on table public.team_events from anon;
revoke all on table public.team_events from authenticated;
grant select, insert, update, delete on table public.team_events to authenticated;

create or replace function private.sync_match_team_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_status public.team_event_status;
begin
  v_status := case new.status
    when 'finished' then 'completed'::public.team_event_status
    when 'cancelled' then 'cancelled'::public.team_event_status
    else 'scheduled'::public.team_event_status
  end;

  insert into public.team_events (
    team_id,
    linked_match_id,
    event_type,
    title,
    starts_at,
    ends_at,
    venue,
    memo,
    status,
    created_by
  ) values (
    new.team_id,
    new.id,
    'official_match',
    left(new.name || ' vs ' || new.opponent_name, 120),
    new.scheduled_at,
    null,
    new.venue,
    new.memo,
    v_status,
    auth.uid()
  )
  on conflict (linked_match_id) where linked_match_id is not null
  do update set
    team_id = excluded.team_id,
    title = excluded.title,
    starts_at = excluded.starts_at,
    venue = excluded.venue,
    memo = excluded.memo,
    status = excluded.status;

  return new;
end;
$$;

revoke all on function private.sync_match_team_event() from public;
revoke all on function private.sync_match_team_event() from anon;
revoke all on function private.sync_match_team_event() from authenticated;

drop trigger if exists matches_sync_team_event on public.matches;
create trigger matches_sync_team_event
after insert or update of team_id, name, opponent_name, scheduled_at, venue, memo, status
on public.matches
for each row execute function private.sync_match_team_event();

insert into public.team_events (
  team_id,
  linked_match_id,
  event_type,
  title,
  starts_at,
  venue,
  memo,
  status
)
select
  m.team_id,
  m.id,
  'official_match'::public.team_event_type,
  left(m.name || ' vs ' || m.opponent_name, 120),
  m.scheduled_at,
  m.venue,
  m.memo,
  case m.status
    when 'finished' then 'completed'::public.team_event_status
    when 'cancelled' then 'cancelled'::public.team_event_status
    else 'scheduled'::public.team_event_status
  end
from public.matches m
on conflict (linked_match_id) where linked_match_id is not null do nothing;
