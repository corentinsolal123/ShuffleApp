-- Fixes flagged by the Supabase security and performance advisors.

-- rls_auto_enable() comes from the dashboard's "automatic RLS" option, not from
-- these migrations, so it may be missing. It is an event trigger function:
-- nobody needs to call it through the API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- Composite foreign keys get a covering index, for cascading deletes from
-- garments and occasions. They replace the single-column ones.
drop index public.garment_exclusions_b_idx;
create index garment_exclusions_a_user_idx on public.garment_exclusions (garment_a_id, user_id);
create index garment_exclusions_b_user_idx on public.garment_exclusions (garment_b_id, user_id);

drop index public.garment_occasions_occasion_idx;
create index garment_occasions_garment_user_idx on public.garment_occasions (garment_id, user_id);
create index garment_occasions_occasion_user_idx on public.garment_occasions (occasion_id, user_id);
