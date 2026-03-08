-- First, drop the functions if they exist with different return types
DROP FUNCTION IF EXISTS get_revenue_trend(uuid, int);
DROP FUNCTION IF EXISTS get_order_volume(uuid, int);
DROP FUNCTION IF EXISTS get_peak_hours(uuid, int);
DROP FUNCTION IF EXISTS get_top_items(uuid, int, int);
DROP FUNCTION IF EXISTS get_orders_by_status(uuid, int);

-- 1. get_revenue_trend
CREATE OR REPLACE FUNCTION get_revenue_trend(p_restaurant_id uuid, p_hours int)
RETURNS TABLE (time_bucket text, revenue numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', o.created_at)::text AS time_bucket,
    COALESCE(SUM(o.total_amount - COALESCE(o.discount_amount, 0))::numeric, 0) AS revenue
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.status = 'delivered'
    AND o.created_at >= NOW() - (p_hours || ' hours')::interval
  GROUP BY date_trunc('hour', o.created_at)
  ORDER BY time_bucket ASC;
END;
$$ LANGUAGE plpgsql;

-- 2. get_order_volume
CREATE OR REPLACE FUNCTION get_order_volume(p_restaurant_id uuid, p_hours int)
RETURNS TABLE (time_bucket text, status text, order_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', o.created_at)::text AS time_bucket,
    o.status::text AS status,
    COUNT(*)::bigint AS order_count
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= NOW() - (p_hours || ' hours')::interval
    AND o.status != 'cancelled'
  GROUP BY date_trunc('hour', o.created_at), o.status
  ORDER BY time_bucket ASC;
END;
$$ LANGUAGE plpgsql;

-- 3. get_peak_hours
CREATE OR REPLACE FUNCTION get_peak_hours(p_restaurant_id uuid, p_days int)
RETURNS TABLE (hour_of_day numeric, avg_orders numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM o.created_at)::numeric AS hour_of_day,
    ROUND((COUNT(*)::numeric / NULLIF(p_days, 0))::numeric, 1) AS avg_orders
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= NOW() - (p_days || ' days')::interval
    AND o.status != 'cancelled'
  GROUP BY EXTRACT(HOUR FROM o.created_at)
  ORDER BY avg_orders DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. get_top_items
CREATE OR REPLACE FUNCTION get_top_items(p_restaurant_id uuid, p_limit int, p_hours int)
RETURNS TABLE (item_id uuid, item_name text, image_url text, order_count numeric, total_revenue numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id AS item_id,
    MAX(mi.name)::text AS item_name,
    MAX(mi.image_url)::text AS image_url,
    SUM(oi.quantity)::numeric AS order_count,
    SUM(oi.total_price)::numeric AS total_revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= NOW() - (p_hours || ' hours')::interval
    AND o.status != 'cancelled'
  GROUP BY mi.id
  ORDER BY order_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 5. get_orders_by_status
CREATE OR REPLACE FUNCTION get_orders_by_status(p_restaurant_id uuid, p_hours int)
RETURNS TABLE (status text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.status::text AS status,
    COUNT(*)::bigint AS count
  FROM orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND o.created_at >= NOW() - (p_hours || ' hours')::interval
  GROUP BY o.status;
END;
$$ LANGUAGE plpgsql;
