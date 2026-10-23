-- Deleting an occasion must never leave a garment without any occasion.
-- Garments whose only occasion is the deleted one are moved to a replacement;
-- without a replacement the deletion is refused. One occasion always remains.

create or replace function public.delete_occasion(p_id uuid, p_replacement_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_replacement_id = p_id then
    raise exception 'The replacement must be another occasion' using errcode = '22023';
  end if;

  if not exists (select 1 from public.occasions where id = p_id) then
    raise exception 'Occasion not found' using errcode = 'P0002';
  end if;

  if (select count(*) from public.occasions) <= 1 then
    raise exception 'At least one occasion must remain' using errcode = '23514', hint = 'last_occasion';
  end if;

  if p_replacement_id is null then
    if exists (
      select 1
      from public.garment_occasions link
      where link.occasion_id = p_id
        and not exists (
          select 1 from public.garment_occasions other
          where other.garment_id = link.garment_id and other.occasion_id <> p_id
        )
    ) then
      raise exception 'Some garments only have this occasion' using errcode = '23514', hint = 'sole_occasion';
    end if;
  else
    -- The composite foreign key rejects a replacement owned by someone else.
    insert into public.garment_occasions (garment_id, occasion_id)
    select link.garment_id, p_replacement_id
    from public.garment_occasions link
    where link.occasion_id = p_id
      and not exists (
        select 1 from public.garment_occasions other
        where other.garment_id = link.garment_id and other.occasion_id <> p_id
      )
    on conflict do nothing;
  end if;

  delete from public.occasions where id = p_id;
end;
$$;

revoke execute on function public.delete_occasion from public, anon;
grant execute on function public.delete_occasion to authenticated;
