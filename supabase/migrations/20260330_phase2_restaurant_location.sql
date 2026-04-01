-- ====================================================================
-- Phase 2: location fields for distance filtering
-- ====================================================================

alter table public.restaurants
  add column if not exists latitude double precision check (latitude >= -90 and latitude <= 90),
  add column if not exists longitude double precision check (longitude >= -180 and longitude <= 180);

create index if not exists restaurants_lat_lng_idx
  on public.restaurants (latitude, longitude);
