create or replace function private.set_match_completed_at_on_finish()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if new.status = 'finished'
     and old.status is distinct from 'finished'
     and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.set_match_completed_at_on_finish() from public;
revoke all on function private.set_match_completed_at_on_finish() from anon;
revoke all on function private.set_match_completed_at_on_finish() from authenticated;

drop trigger if exists matches_set_completed_at_on_finish on public.matches;
create trigger matches_set_completed_at_on_finish
before update of status on public.matches
for each row execute function private.set_match_completed_at_on_finish();
