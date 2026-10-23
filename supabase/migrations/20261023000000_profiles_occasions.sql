-- Profiles and occasions, created automatically for every new user.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  default_city text check (default_city is null or char_length(btrim(default_city)) between 1 and 100),
  default_latitude double precision check (default_latitude between -90 and 90),
  default_longitude double precision check (default_longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_coordinates_pair check ((default_latitude is null) = (default_longitude is null))
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Explicit grants: anonymous visitors never touch user data.
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- occasions: user-editable list (quotidien, travail, ...)
-- ---------------------------------------------------------------------------

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index occasions_user_name_key on public.occasions (user_id, lower(name));
create index occasions_user_position_idx on public.occasions (user_id, position);

revoke all on public.occasions from anon;
grant select, insert, update, delete on public.occasions to authenticated;

alter table public.occasions enable row level security;

create policy "occasions_select_own" on public.occasions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "occasions_insert_own" on public.occasions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "occasions_update_own" on public.occasions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "occasions_delete_own" on public.occasions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + default occasions
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.occasions (user_id, name, position)
  values
    (new.id, 'Quotidien', 0),
    (new.id, 'Travail', 1),
    (new.id, 'Sport', 2),
    (new.id, 'Soirée', 3);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
