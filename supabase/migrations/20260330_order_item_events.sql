-- Order item events for partner notifications

create table if not exists public.order_item_events (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid,
  event_type text not null check (event_type in ('item_added', 'item_updated', 'item_removed')),
  payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id),
  created_at timestamptz default now() not null
);

create index if not exists idx_order_item_events_restaurant_id
  on public.order_item_events(restaurant_id);

create index if not exists idx_order_item_events_order_id
  on public.order_item_events(order_id);

create index if not exists idx_order_item_events_created_at
  on public.order_item_events(created_at);

alter table public.order_item_events enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'order_item_events'
       and policyname = 'Order item events select for owners'
  ) then
    execute 'create policy "Order item events select for owners" on public.order_item_events
      for select using (
        restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
      )';
  end if;

  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'order_item_events'
       and policyname = 'Order item events insert for owners'
  ) then
    execute 'create policy "Order item events insert for owners" on public.order_item_events
      for insert with check (
        restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
      )';
  end if;
end
$$;

create or replace function public.record_order_item_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_event_type text;
  v_payload jsonb;
  v_is_initial boolean := false;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'item_added';
  elsif tg_op = 'UPDATE' then
    if (coalesce(new.quantity, 0) = coalesce(old.quantity, 0)
      and coalesce(new.unit_price, 0) = coalesce(old.unit_price, 0)
      and coalesce(new.total_price, 0) = coalesce(old.total_price, 0)
      and coalesce(new.item_name, '') = coalesce(old.item_name, '')
      and coalesce(new.item_notes, '') = coalesce(old.item_notes, '')
      and coalesce(new.variant_details::text, '') = coalesce(old.variant_details::text, '')
      and coalesce(new.modifiers_info::text, '') = coalesce(old.modifiers_info::text, '')
    ) then
      return new;
    end if;
    v_event_type := 'item_updated';
  elsif tg_op = 'DELETE' then
    v_event_type := 'item_removed';
  end if;

  select *
    into v_order
    from public.orders
    where id = coalesce(new.order_id, old.order_id);

  if v_order.id is null then
    return coalesce(new, old);
  end if;

  v_is_initial := (now() - v_order.created_at) < interval '10 seconds';

  v_payload := jsonb_build_object(
    'item_name', coalesce(new.item_name, old.item_name),
    'quantity', coalesce(new.quantity, old.quantity),
    'unit_price', coalesce(new.unit_price, old.unit_price),
    'total_price', coalesce(new.total_price, old.total_price),
    'order_created_at', v_order.created_at,
    'order_status', v_order.status,
    'is_initial', v_is_initial
  );

  insert into public.order_item_events (
    restaurant_id,
    order_id,
    order_item_id,
    event_type,
    payload,
    actor_user_id
  ) values (
    v_order.restaurant_id,
    v_order.id,
    coalesce(new.id, old.id),
    v_event_type,
    v_payload,
    auth.uid()
  );

  return coalesce(new, old);
exception
  when others then
    raise warning 'order_item_events failed: %', SQLERRM;
    return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_order_item_events on public.order_items;
create trigger trigger_order_item_events
  after insert or update or delete on public.order_items
  for each row execute function public.record_order_item_event();

do $$
begin
  if not exists (
    select 1
      from pg_publication_rel pr
      join pg_class c on c.oid = pr.prrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_publication p on p.oid = pr.prpubid
     where p.pubname = 'supabase_realtime'
       and n.nspname = 'public'
       and c.relname = 'order_item_events'
  ) then
    alter publication supabase_realtime add table public.order_item_events;
  end if;
end
$$;
