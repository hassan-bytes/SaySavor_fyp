-- Drop first to ensure no signature conflicts
drop function if exists get_dashboard_stats(uuid);

-- Create a function to get dashboard stats efficiently
create or replace function get_dashboard_stats(p_restaurant_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  today_start timestamp;
  v_today_revenue numeric;
  v_total_orders integer;
  v_active_orders integer;
  v_avg_prep_time text;
begin
  -- Set today's start time (00:00:00) based on server time (UTC)
  today_start := current_date; 
  
  -- Calculate Today's Revenue (Delivered orders only)
  select coalesce(sum(total_amount), 0)
  into v_today_revenue
  from orders
  where restaurant_id = p_restaurant_id
    and created_at >= today_start
    and status = 'delivered';

  -- Calculate Total Orders Today
  select count(*)
  into v_total_orders
  from orders
  where restaurant_id = p_restaurant_id
    and created_at >= today_start;

  -- Calculate Active Orders (Pending or Cooking)
  select count(*)
  into v_active_orders
  from orders
  where restaurant_id = p_restaurant_id
    and status in ('pending', 'cooking');

  -- Mock Avg Prep Time for now
  v_avg_prep_time := '18m';

  return json_build_object(
    'revenue', v_today_revenue,
    'total_orders', v_total_orders,
    'active_orders', v_active_orders,
    'avg_prep_time', v_avg_prep_time
  );
end;
$$;

-- Grant execute permission to authenticated users (Dashboard users)
grant execute on function get_dashboard_stats(uuid) to authenticated;
grant execute on function get_dashboard_stats(uuid) to service_role;
