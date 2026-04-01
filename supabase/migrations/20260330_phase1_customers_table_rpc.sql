-- ====================================================================
-- Phase 1: customers table + existence RPC
-- ====================================================================

create table if not exists public.customers (
  id uuid references auth.users(id) on delete cascade primary key,
  phone text,
  email text,
  name text,
  points integer default 0 check (points >= 0),
  created_at timestamptz default now() not null
);

create unique index if not exists customers_phone_unique_idx
  on public.customers (phone)
  where phone is not null;

create unique index if not exists customers_email_unique_idx
  on public.customers (lower(email))
  where email is not null;

alter table public.customers enable row level security;

create policy "Customers can read own record" on public.customers
  for select using (auth.uid() = id);

create policy "Customers can insert own record" on public.customers
  for insert with check (auth.uid() = id);

create policy "Customers can update own record" on public.customers
  for update using (auth.uid() = id);

create or replace function public.check_customer_exists(identifier text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.customers
    where (email is not null and lower(email) = lower(identifier))
       or (phone is not null and phone = identifier)
  );
end;
$$;

grant execute on function public.check_customer_exists(text) to authenticated;
grant execute on function public.check_customer_exists(text) to anon;
