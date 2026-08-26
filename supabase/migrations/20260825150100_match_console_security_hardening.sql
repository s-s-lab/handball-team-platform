-- Keep runtime status transitions authoritative inside the match action engine.
revoke update on table public.matches from authenticated;
grant update (name, opponent_name, team_side, scheduled_at, venue, memo, is_public)
  on table public.matches to authenticated;

-- This helper is only called from security-definer runtime functions and should not be externally executable.
revoke all on function private.match_period_duration_ms(uuid, integer) from authenticated;
