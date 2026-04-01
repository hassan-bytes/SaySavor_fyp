-- ====================================================================
-- Multi-Role Management: roles and user_roles tables
-- ====================================================================

create table if not exists public.roles (
  id serial primary key,
  name text unique not null
);

create table if not exists public.user_roles (
  user_id uuid references public.profiles(id) on delete cascade,
  role_id integer references public.roles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, role_id)
);

-- Insert default roles
insert into public.roles (name) values ('customer') on conflict do nothing;
insert into public.roles (name) values ('partner') on conflict do nothing;
insert into public.roles (name) values ('admin') on conflict do nothing;
