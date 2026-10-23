-- Compatibility rules. Everything is compatible by default; users add exclusions:
-- "this garment never goes with that one", "never this colour with that one".

-- ---------------------------------------------------------------------------
-- Palette shared by garments and colour rules (keys of lib/palette.ts)
-- ---------------------------------------------------------------------------

create or replace function public.palette_colors()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    'black', 'white', 'grey', 'beige', 'brown', 'navy', 'blue',
    'green', 'red', 'burgundy', 'pink', 'yellow', 'orange', 'pattern'
  ]::text[]
$$;

alter table public.garments
  drop constraint garments_colors_check,
  add constraint garments_colors_check
    check (cardinality(colors) between 1 and 3 and colors <@ public.palette_colors());

-- ---------------------------------------------------------------------------
-- garment_exclusions: unordered pair of garments from different categories
-- ---------------------------------------------------------------------------

create table public.garment_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  garment_a_id uuid not null,
  garment_b_id uuid not null,
  created_at timestamptz not null default now(),
  -- Pairs are stored ordered so (a, b) and (b, a) are the same rule.
  constraint garment_exclusions_ordered check (garment_a_id < garment_b_id),
  constraint garment_exclusions_pair_key unique (garment_a_id, garment_b_id),
  foreign key (garment_a_id, user_id) references public.garments (id, user_id) on delete cascade,
  foreign key (garment_b_id, user_id) references public.garments (id, user_id) on delete cascade
);

create index garment_exclusions_user_idx on public.garment_exclusions (user_id);
create index garment_exclusions_b_idx on public.garment_exclusions (garment_b_id);

create or replace function public.garment_exclusions_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_swap uuid;
begin
  if new.garment_a_id > new.garment_b_id then
    v_swap := new.garment_a_id;
    new.garment_a_id := new.garment_b_id;
    new.garment_b_id := v_swap;
  end if;

  -- An outfit has one garment per category: excluding two tops is meaningless.
  if (select category from public.garments where id = new.garment_a_id)
     = (select category from public.garments where id = new.garment_b_id) then
    raise exception 'Excluded garments must belong to different categories' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger garment_exclusions_normalize
  before insert or update on public.garment_exclusions
  for each row execute function public.garment_exclusions_normalize();

revoke all on public.garment_exclusions from anon;
grant select, insert, delete on public.garment_exclusions to authenticated;

alter table public.garment_exclusions enable row level security;

create policy "garment_exclusions_select_own" on public.garment_exclusions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "garment_exclusions_insert_own" on public.garment_exclusions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "garment_exclusions_delete_own" on public.garment_exclusions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- color_exclusions: unordered pair of palette colours (may be the same colour,
-- e.g. "never black with black")
-- ---------------------------------------------------------------------------

create table public.color_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  color_a text not null check (color_a = any (public.palette_colors())),
  color_b text not null check (color_b = any (public.palette_colors())),
  created_at timestamptz not null default now(),
  constraint color_exclusions_ordered check (color_a <= color_b),
  constraint color_exclusions_pair_key unique (user_id, color_a, color_b)
);

create or replace function public.color_exclusions_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_swap text;
begin
  if new.color_a > new.color_b then
    v_swap := new.color_a;
    new.color_a := new.color_b;
    new.color_b := v_swap;
  end if;
  return new;
end;
$$;

create trigger color_exclusions_normalize
  before insert or update on public.color_exclusions
  for each row execute function public.color_exclusions_normalize();

revoke all on public.color_exclusions from anon;
grant select, insert, delete on public.color_exclusions to authenticated;

alter table public.color_exclusions enable row level security;

create policy "color_exclusions_select_own" on public.color_exclusions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "color_exclusions_insert_own" on public.color_exclusions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "color_exclusions_delete_own" on public.color_exclusions
  for delete to authenticated
  using ((select auth.uid()) = user_id);
