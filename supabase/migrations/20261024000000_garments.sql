-- Garments, their occasions, and the private photo bucket.

create type public.garment_category as enum ('top', 'bottom', 'shoes');
create type public.season as enum ('spring', 'summer', 'autumn', 'winter');

-- ---------------------------------------------------------------------------
-- garments
-- ---------------------------------------------------------------------------

create table public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  category public.garment_category not null,
  -- Keys of the predefined palette (lib/palette.ts), 1 to 3 main colours.
  colors text[] not null check (
    cardinality(colors) between 1 and 3
    and colors <@ array[
      'black', 'white', 'grey', 'beige', 'brown', 'navy', 'blue',
      'green', 'red', 'burgundy', 'pink', 'yellow', 'orange', 'pattern'
    ]::text[]
  ),
  -- Empty means "all seasons".
  seasons public.season[] not null default '{}',
  warmth smallint not null check (warmth between 1 and 3),
  rain_ok boolean not null default false,
  -- Object path in the "garments" bucket, always under the owner's folder.
  photo_path text not null check (split_part(photo_path, '/', 1) = user_id::text),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target of the composite foreign keys that keep links within one user.
  unique (id, user_id)
);

create index garments_user_category_idx on public.garments (user_id, category, created_at desc);

create trigger garments_set_updated_at
  before update on public.garments
  for each row execute function public.set_updated_at();

revoke all on public.garments from anon;
grant select, insert, update, delete on public.garments to authenticated;

alter table public.garments enable row level security;

create policy "garments_select_own" on public.garments
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "garments_insert_own" on public.garments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "garments_update_own" on public.garments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "garments_delete_own" on public.garments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- garment_occasions: many-to-many, both sides owned by the same user
-- ---------------------------------------------------------------------------

alter table public.occasions add constraint occasions_id_user_key unique (id, user_id);

create table public.garment_occasions (
  garment_id uuid not null,
  occasion_id uuid not null,
  user_id uuid not null default auth.uid(),
  primary key (garment_id, occasion_id),
  foreign key (garment_id, user_id) references public.garments (id, user_id) on delete cascade,
  foreign key (occasion_id, user_id) references public.occasions (id, user_id) on delete cascade
);

create index garment_occasions_occasion_idx on public.garment_occasions (occasion_id);
create index garment_occasions_user_idx on public.garment_occasions (user_id);

revoke all on public.garment_occasions from anon;
grant select, insert, delete on public.garment_occasions to authenticated;

alter table public.garment_occasions enable row level security;

create policy "garment_occasions_select_own" on public.garment_occasions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "garment_occasions_insert_own" on public.garment_occasions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "garment_occasions_delete_own" on public.garment_occasions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- save_garment: creates or updates a garment and its occasions atomically.
-- Runs as the caller, so RLS applies to every statement.
-- ---------------------------------------------------------------------------

create or replace function public.save_garment(
  p_id uuid,
  p_name text,
  p_category public.garment_category,
  p_colors text[],
  p_seasons public.season[],
  p_warmth integer,
  p_rain_ok boolean,
  p_photo_path text,
  p_occasion_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(cardinality(p_occasion_ids), 0) = 0 then
    raise exception 'A garment needs at least one occasion' using errcode = '23514';
  end if;

  if p_id is null then
    insert into public.garments (name, category, colors, seasons, warmth, rain_ok, photo_path)
    values (btrim(p_name), p_category, p_colors, p_seasons, p_warmth, p_rain_ok, p_photo_path)
    returning id into v_id;
  else
    update public.garments
    set name = btrim(p_name),
        category = p_category,
        colors = p_colors,
        seasons = p_seasons,
        warmth = p_warmth,
        rain_ok = p_rain_ok,
        photo_path = p_photo_path
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Garment not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.garment_occasions
  where garment_id = v_id and occasion_id <> all (p_occasion_ids);

  insert into public.garment_occasions (garment_id, occasion_id)
  select v_id, occasion_id from unnest(p_occasion_ids) as occasion_id
  on conflict do nothing;

  return v_id;
end;
$$;

revoke execute on function public.save_garment from public, anon;
grant execute on function public.save_garment to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, one folder per user ({user_id}/{file})
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('garments', 'garments', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "garment_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'garments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "garment_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'garments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "garment_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'garments' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'garments' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "garment_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'garments' and (storage.foldername(name))[1] = (select auth.uid())::text);
