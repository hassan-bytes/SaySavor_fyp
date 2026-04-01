-- ====================================================================
-- Phase 2: home/discovery restaurant fields
-- ====================================================================

alter table public.restaurants
  add column if not exists city text,
  add column if not exists rating numeric check (rating >= 0 and rating <= 5);
