-- Function to hard delete a service and all its associated packages
-- Uses DELETE with CASCADE due to foreign key constraints

CREATE OR REPLACE FUNCTION hard_delete_service(
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
  service_packages_table TEXT;
  deleted_count INTEGER := 0;
  deleted_id UUID;
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
  service_packages_table := agent_prefix || '_service_packages';

  -- Hard delete service (packages will be deleted via ON DELETE CASCADE)
  EXECUTE format('DELETE FROM %I WHERE id = $1 AND agent_id = $2 RETURNING id', services_table)
  INTO deleted_id
  USING p_service_id, p_agent_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  -- Confirm packages deleted (optional, since cascade handles it)
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE service_id = $1', service_packages_table)
  INTO deleted_count
  USING p_service_id;

  IF deleted_count > 0 THEN
    RAISE EXCEPTION 'Packages not deleted via cascade - check constraints';
  END IF;

  result := jsonb_build_object(
    'service_id', deleted_id,
    'deleted_count', 1,
    'message', 'Service and packages hard deleted successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Hard delete failed: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION hard_delete_service(BIGINT, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION hard_delete_service IS 'Hard deletes a service and its packages via CASCADE for an agent';