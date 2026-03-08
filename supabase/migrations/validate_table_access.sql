-- Function to validate if a table number belongs to a restaurant owner
-- This allows public customers scanning a QR code to verify the table exists
-- without giving them access to query the protected auth.users table directly.

CREATE OR REPLACE FUNCTION public.validate_table_access(r_id UUID, t_no INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to access auth.users
AS $$
DECLARE
  v_owner_id UUID;
  v_tables_list JSONB;
BEGIN
  -- 1. Get the owner_id of the restaurant
  SELECT owner_id INTO v_owner_id
  FROM public.restaurants
  WHERE id = r_id;

  IF v_owner_id IS NULL THEN
    RETURN FALSE; -- Restaurant not found
  END IF;

  -- 2. Get the tables_list from the owner's user_metadata in auth.users
  SELECT raw_user_meta_data->'tables_list' INTO v_tables_list
  FROM auth.users
  WHERE id = v_owner_id;

  -- 3. Check if the table number exists in the JSONB array
  -- If v_tables_list is null (meaning no custom tables saved yet), 
  -- fallback to allowing Table 1 just in case, or block everything. 
  -- QRBuilder sets total_tables, and tables_list. 
  
  IF v_tables_list IS NULL THEN
     -- Legacy fallback check: does total_tables metadata exist?
     DECLARE v_total INT;
     BEGIN
       SELECT (raw_user_meta_data->>'total_tables')::INT INTO v_total
       FROM auth.users WHERE id = v_owner_id;
       
       IF v_total IS NOT NULL AND t_no > 0 AND t_no <= v_total THEN
          RETURN TRUE;
       ELSE
          RETURN FALSE;
       END IF;
     END;
  END IF;

  -- Check if the specific table number is in the array.
  -- The '?|' operator checks if any of the array elements exist as top-level text strings.
  -- Alternatively, use jsonb_array_elements to loop.
  
  -- Simpler check: see if the scalar value is contained in the JSONB array
  IF v_tables_list @> to_jsonb(t_no) THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;

END;
$$;
