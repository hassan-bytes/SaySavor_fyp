-- Ensure dashboard stats handle payment_status casing and COD/CASH naming consistently
-- This keeps partner revenue reporting accurate for historical and new orders.

drop function if exists get_dashboard_stats(uuid);

create or replace function get_dashboard_stats(p_restaurant_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  today_start timestamp;
  v_cash_revenue numeric;
  v_online_revenue numeric;
  v_total_orders integer;
  v_active_orders integer;
  v_avg_prep_time text;
begin
  today_start := current_date;

  -- Delivered cash/COD revenue for today
  select coalesce(sum(total_amount), 0)
  into v_cash_revenue
  from orders
  where restaurant_id = p_restaurant_id
    and created_at >= today_start
    and status = 'delivered'
    and (
      payment_method is null
      or upper(payment_method) in ('CASH', 'COD')
    );

  -- Successful online paid revenue for today (case-insensitive status support)
  select coalesce(sum(total_amount), 0)
  into v_online_revenue
  from orders
  where restaurant_id = p_restaurant_id
    and created_at >= today_start
    and upper(coalesce(payment_status, '')) = 'PAID'
    and upper(coalesce(payment_method, '')) = 'ONLINE';

  select count(*)
  into v_total_orders
  from orders
  where restaurant_id = p_restaurant_id
    and created_at >= today_start;

  select count(*)
  into v_active_orders
  from orders
  where restaurant_id = p_restaurant_id
    and status in ('pending', 'cooking');

  v_avg_prep_time := '18m';

  return json_build_object(
    'revenue', v_cash_revenue + v_online_revenue,
    'cash_revenue', v_cash_revenue,
    'online_revenue', v_online_revenue,
    'total_orders', v_total_orders,
    'active_orders', v_active_orders,
    'avg_prep_time', v_avg_prep_time
  );
end;
$$;

grant execute on function get_dashboard_stats(uuid) to authenticated;
grant execute on function get_dashboard_stats(uuid) to service_role;
