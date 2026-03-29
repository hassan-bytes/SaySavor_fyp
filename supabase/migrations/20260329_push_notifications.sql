-- Push notification subscriptions (Web Push)

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_seen_at timestamptz default now() not null,
  unique (endpoint)
);

create index if not exists idx_push_subscriptions_restaurant_id
  on public.push_subscriptions(restaurant_id);

alter table public.push_subscriptions enable row level security;

create policy "Push subscriptions insert for owners" on public.push_subscriptions
  for insert with check (
    auth.uid() = user_id
    and restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
  );

create policy "Push subscriptions update for owners" on public.push_subscriptions
  for update using (
    auth.uid() = user_id
    and restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
  );

create policy "Push subscriptions delete for owners" on public.push_subscriptions
  for delete using (
    auth.uid() = user_id
    and restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
  );

create policy "Push subscriptions select for owners" on public.push_subscriptions
  for select using (
    auth.uid() = user_id
    and restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
  );

-- Keep updated_at fresh
create trigger update_push_subscriptions_timestamp
  before update on public.push_subscriptions
  for each row execute procedure moddatetime (updated_at);

-- Trigger edge function on new orders and item additions
create or replace function public.notify_order_push()
returns trigger
language plpgsql
security definer
as $$
declare
  order_id uuid;
  restaurant_id uuid;
  order_created_at timestamptz;
  payload jsonb;
  function_url text := 'https://xpkpegzwgrwfuotonvnh.functions.supabase.co/order-push';
begin
  if tg_table_name = 'orders' then
    order_id := new.id;
    restaurant_id := new.restaurant_id;

    payload := jsonb_build_object(
      'event', 'order_created',
      'order_id', order_id,
      'restaurant_id', restaurant_id
    );

    perform supabase_functions.http_request(
      function_url,
      'POST',
      '{"Content-Type":"application/json"}',
      payload::text
    );

    return new;
  end if;

  if tg_table_name = 'order_items' then
    order_id := new.order_id;

    select o.restaurant_id, o.created_at
      into restaurant_id, order_created_at
      from public.orders o
      where o.id = order_id;

    if restaurant_id is null then
      return new;
    end if;

    -- Skip item-added pushes for fresh orders to avoid duplicates
    if now() - order_created_at < interval '30 seconds' then
      return new;
    end if;

    payload := jsonb_build_object(
      'event', 'order_item_added',
      'order_id', order_id,
      'restaurant_id', restaurant_id,
      'item_name', new.item_name
    );

    perform supabase_functions.http_request(
      function_url,
      'POST',
      '{"Content-Type":"application/json"}',
      payload::text
    );

    return new;
  end if;

  return new;
exception
  when others then
    raise warning 'Push notify failed: %', SQLERRM;
    return new;
end;
$$;

drop trigger if exists trigger_order_push on public.orders;
create trigger trigger_order_push
  after insert on public.orders
  for each row execute function public.notify_order_push();

drop trigger if exists trigger_order_item_push on public.order_items;
create trigger trigger_order_item_push
  after insert on public.order_items
  for each row execute function public.notify_order_push();
