-- ============================================
-- DASHBOARD ANALYTICS RPC FUNCTIONS
-- ============================================
-- These functions provide time-filtered analytics for the Partner Dashboard
-- Supports 3 time ranges: 3 hours, 24 hours, 7 days

-- ============================================
-- 1. GET REVENUE TREND
-- ============================================
-- Returns revenue data broken down by time buckets
-- Usage: SELECT * FROM get_revenue_trend('restaurant-uuid', 24);

CREATE OR REPLACE FUNCTION get_revenue_trend(
  p_restaurant_id UUID,
  p_hours INT DEFAULT 24
)
RETURNS TABLE (
  time_bucket TIMESTAMP,
  revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', created_at) AS time_bucket,
    COALESCE(SUM(total_amount), 0)::DECIMAL AS revenue
  FROM orders
  WHERE 
    restaurant_id = p_restaurant_id
    AND created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND status = 'delivered' -- Only count delivered orders
  GROUP BY time_bucket
  ORDER BY time_bucket ASC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 2. GET ORDER VOLUME BY STATUS
-- ============================================
-- Returns order counts broken down by time and status
-- Usage: SELECT * FROM get_order_volume('restaurant-uuid', 24);

CREATE OR REPLACE FUNCTION get_order_volume(
  p_restaurant_id UUID,
  p_hours INT DEFAULT 24
)
RETURNS TABLE (
  time_bucket TIMESTAMP,
  order_count INT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', created_at) AS time_bucket,
    COUNT(*)::INT AS order_count,
    status::TEXT
  FROM orders
  WHERE 
    restaurant_id = p_restaurant_id
    AND created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY time_bucket, status
  ORDER BY time_bucket ASC, status;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 3. GET TOP ITEMS
-- ============================================
-- Returns best performing menu items by orders and revenue
-- Usage: SELECT * FROM get_top_items('restaurant-uuid', 5, 24);

CREATE OR REPLACE FUNCTION get_top_items(
  p_restaurant_id UUID,
  p_limit INT DEFAULT 5,
  p_hours INT DEFAULT 24
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  image_url TEXT,
  order_count BIGINT,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oi.menu_item_id AS item_id,
    mi.name::TEXT AS item_name,
    mi.image_url::TEXT,
    COUNT(oi.id)::BIGINT AS order_count,
    SUM(oi.quantity * oi.price)::DECIMAL AS total_revenue
  FROM order_items oi
  INNER JOIN orders o ON oi.order_id = o.id
  INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
  WHERE 
    o.restaurant_id = p_restaurant_id
    AND o.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND o.status = 'delivered'
  GROUP BY oi.menu_item_id, mi.name, mi.image_url
  ORDER BY order_count DESC, total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 4. GET PEAK HOURS
-- ============================================
-- Returns average order volume per hour of day over N days
-- Usage: SELECT * FROM get_peak_hours('restaurant-uuid', 7);

CREATE OR REPLACE FUNCTION get_peak_hours(
  p_restaurant_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  hour_of_day INT,
  avg_orders DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at)::INT AS hour_of_day,
    (COUNT(*) / p_days::DECIMAL)::DECIMAL AS avg_orders
  FROM orders
  WHERE 
    restaurant_id = p_restaurant_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY hour_of_day
  ORDER BY hour_of_day ASC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 5. GET ORDERS BY STATUS
-- ============================================
-- Returns current count of orders in each status
-- Usage: SELECT * FROM get_orders_by_status('restaurant-uuid', 24);

CREATE OR REPLACE FUNCTION get_orders_by_status(
  p_restaurant_id UUID,
  p_hours INT DEFAULT 24
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.status::TEXT,
    COUNT(*)::BIGINT
  FROM orders o
  WHERE 
    o.restaurant_id = p_restaurant_id
    AND o.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY o.status
  ORDER BY o.status;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Get last 3 hours revenue trend:
-- SELECT * FROM get_revenue_trend('your-restaurant-id', 3);

-- Get last 24 hours order volume:
-- SELECT * FROM get_order_volume('your-restaurant-id', 24);

-- Get top 5 items from last 7 days (168 hours):
-- SELECT * FROM get_top_items('your-restaurant-id', 5, 168);

-- Get peak hours analysis for last 7 days:
-- SELECT * FROM get_peak_hours('your-restaurant-id', 7);

-- Get current order status breakdown:
-- SELECT * FROM get_orders_by_status('your-restaurant-id', 24);
