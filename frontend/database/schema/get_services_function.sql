-- Function to get active services with nested packages for an agent
-- Handles dynamic table names based on agent_prefix

CREATE OR REPLACE FUNCTION get_agent_services(
  p_agent_id BIGINT,
  p_service_name_filter VARCHAR DEFAULT NULL,
  p_package_name_filter VARCHAR DEFAULT NULL,
  p_sort_by VARCHAR DEFAULT 'created_at',
  p_sort_order VARCHAR DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  service_name VARCHAR,
  description TEXT,
  image_urls JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  packages JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_prefix TEXT;
  services_table TEXT;
  service_packages_table TEXT;
  query TEXT;
  where_clauses TEXT[] := ARRAY[]::TEXT[];
  params TEXT[] := ARRAY[]::TEXT[];
  param_index INTEGER := 1;
  final_query TEXT;
BEGIN
  -- Get agent prefix (qualify columns to avoid ambiguity)
  SELECT agents.agent_prefix INTO agent_prefix
  FROM agents
  WHERE agents.id = p_agent_id;

  IF agent_prefix IS NULL THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;

  services_table := agent_prefix || '_services';
  service_packages_table := agent_prefix || '_service_packages';

  -- Validate sort
  IF p_sort_by NOT IN ('price', 'created_at') THEN
    RAISE EXCEPTION 'Invalid sort_by: %', p_sort_by;
  END IF;

  -- Build base query
  query := format('
    SELECT 
      s.id,
      s.service_name,
      s.description,
      s.image_urls,
      s.is_active,
      s.created_at,
      s.updated_at,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            ''id'', sp.id,
            ''package_name'', sp.package_name,
            ''price'', sp.price,
            ''currency'', sp.currency,
            ''discount'', sp.discount,
            ''description'', sp.description,
            ''is_active'', sp.is_active,
            ''created_at'', sp.created_at,
            ''updated_at'', sp.updated_at
          ) ORDER BY sp.%I %s
        ) FILTER (WHERE sp.is_active = true),
        ''[]''::jsonb
      ) AS packages
    FROM %I s
    LEFT JOIN %I sp ON s.id = sp.service_id AND sp.is_active = true',
    CASE WHEN p_sort_by = 'price' THEN 'price' ELSE 'created_at' END,
    p_sort_order,
    services_table,
    service_packages_table
  );

  -- Add filters
  IF p_service_name_filter IS NOT NULL AND p_service_name_filter != '' THEN
    where_clauses := array_append(where_clauses, format('s.service_name ILIKE $%s', param_index));
    params := array_append(params, format('''%%%s%%''', p_service_name_filter));
    param_index := param_index + 1;
  END IF;

  IF p_package_name_filter IS NOT NULL AND p_package_name_filter != '' THEN
    where_clauses := array_append(where_clauses, format('sp.package_name ILIKE $%s', param_index));
    params := array_append(params, format('''%%%s%%''', p_package_name_filter));
    param_index := param_index + 1;
  END IF;

  -- Add WHERE clause if filters exist
  IF array_length(where_clauses, 1) > 0 THEN
    query := query || ' WHERE ' || array_to_string(where_clauses, ' AND ');
  END IF;

  -- Group and order
  query := query || format('
    GROUP BY s.id, s.service_name, s.description, s.image_urls, s.is_active, s.created_at, s.updated_at
    HAVING s.is_active = true
    ORDER BY s.%I %s',
    p_sort_by,
    p_sort_order
  );

  -- Return the result set
  RETURN QUERY EXECUTE query;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Query failed: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_agent_services(BIGINT, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated, service_role;

COMMENT ON FUNCTION get_agent_services IS 'Fetches active services with nested active packages for an agent, supports filters and sorting';