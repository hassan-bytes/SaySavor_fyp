-- Phase 0: missing restaurant fields + promotions foundation

alter table public.restaurants
  add column if not exists min_order numeric default 0 check (min_order >= 0),
  add column if not exists tax_percent numeric default 0 check (tax_percent >= 0 and tax_percent <= 100),
  add column if not exists delivery_time_min integer check (delivery_time_min is null or delivery_time_min > 0),
  add column if not exists delivery_fee numeric default 0 check (delivery_fee >= 0);

create table if not exists public.promotions (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'flat')),
  discount_value numeric not null check (discount_value > 0),
  max_discount numeric,
  min_order numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean default true,
  usage_limit integer,
  usage_count integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now() not null
);

create unique index if not exists promotions_restaurant_code_idx
  on public.promotions (restaurant_id, upper(code));

create index if not exists promotions_active_idx
  on public.promotions (restaurant_id, is_active);

alter table public.promotions enable row level security;

create policy "Promotions select active" on public.promotions
  for select using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Promotions manage for owners" on public.promotions
  for all using (
    restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
  )
  with check (
    restaurant_id in (select id from public.restaurants where owner_id = auth.uid())
  );
