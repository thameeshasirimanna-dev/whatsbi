-- Function to check if a service has dependencies (e.g., linked to orders, appointments, etc.)
-- Returns JSONB with has_dependencies boolean

CREATE OR REPLACE FUNCTION check_service_dependencies(
  p_agent_id BIGINT,
  p_service_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_prefix TEXT;
  services_table TEXT;
  orders_table TEXT;
  -- Add other tables that might reference services (e.g., custom orders, appointments)
  has_deps BOOLEAN := false;
  dep_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Get agent prefix (qualify columns to avoid ambiguity)
  SELECT agents.agent_prefix INTO agent_prefix
  FROM agents
  WHERE agents.id = p_agent_id;

  IF agent_prefix IS NULL THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;

  services_table := agent_prefix || '_services';
  orders_table := agent_prefix || '_orders';  -- Assuming orders might reference services via notes or custom fields

  -- Check if service exists and is active
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE id = $1 AND agent_id = $2 AND is_active = true', services_table)
  INTO dep_count
  USING p_service_id, p_agent_id;

  IF dep_count = 0 THEN
    RAISE EXCEPTION 'Service not found or inactive';
  END IF;

  -- Check for dependencies (example: search in orders notes for service name or ID)
  -- In a real app, this would query specific foreign key relationships
  EXECUTE format('
    SELECT COUNT(*) 
    FROM %I o 
    JOIN %I s ON o.notes ILIKE ''%%'' || s.service_name || ''%%'' OR o.notes ILIKE ''%%service_id: %s%%''
    WHERE s.id = $1 AND s.agent_id = $2
  ', orders_table, services_table, p_service_id)
  INTO dep_count
  USING p_service_id, p_agent_id;

  has_deps := dep_count > 0;

  -- Add more checks for other tables if needed (appointments, invoices, etc.)
  -- For example:
  -- EXECUTE format('SELECT COUNT(*) FROM %I a WHERE a.notes ILIKE ...', appointments_table) INTO dep_count;
  -- has_deps := has_deps OR (dep_count > 0);

  result := jsonb_build_object(
    'has_dependencies', has_deps,
    'dependency_count', dep_count,
    'service_id', p_service_id
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Dependency check failed: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_service_dependencies(BIGINT, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION check_service_dependencies IS 'Checks if a service has dependencies in other tables before allowing hard delete';