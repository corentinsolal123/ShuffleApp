-- Sign-ups by invitation only. Supabase Auth calls hook_before_user_created
-- (Authentication > Hooks > Before User Created) and refuses any email that is
-- not listed in public.invitations. Admins manage the list: they are the users
-- whose app_metadata holds "admin": true, which only SQL can set.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'admin', '') = 'true';
$$;

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------

create table public.invitations (
  email text primary key check (
    email = lower(btrim(email))
    and char_length(email) <= 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Set when the invited person creates their account.
  accepted_at timestamptz
);

create index invitations_invited_by_idx on public.invitations (invited_by);

revoke all on public.invitations from anon;
grant select, insert, delete on public.invitations to authenticated;

alter table public.invitations enable row level security;

create policy "invitations_select_admin" on public.invitations
  for select to authenticated
  using ((select public.is_admin()));

create policy "invitations_insert_admin" on public.invitations
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "invitations_delete_admin" on public.invitations
  for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Auth hook: only invited emails may create an account
-- ---------------------------------------------------------------------------

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (select 1 from public.invitations where email = lower(event -> 'user' ->> 'email')) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'This email address has not been invited.')
  );
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;

grant select on public.invitations to supabase_auth_admin;
create policy "invitations_select_auth_admin" on public.invitations
  for select to supabase_auth_admin
  using (true);

-- ---------------------------------------------------------------------------
-- Mark the invitation as accepted once the account exists
-- ---------------------------------------------------------------------------

create or replace function public.accept_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invitations set accepted_at = now() where email = lower(new.email) and accepted_at is null;
  return new;
end;
$$;

revoke execute on function public.accept_invitation() from public, anon, authenticated;

create trigger on_auth_user_created_accept_invitation
  after insert on auth.users
  for each row execute function public.accept_invitation();
