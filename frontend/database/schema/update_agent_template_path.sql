-- Function to update invoice template path for agent's own record
-- SECURITY DEFINER to bypass RLS for authenticated agents

DROP FUNCTION IF EXISTS update_agent_template_path(BIGINT, TEXT, UUID) CASCADE;

CREATE OR REPLACE FUNCTION update_agent_template_path(
  p_agent_id BIGINT,
  p_template_path TEXT,
  p_current_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  target_user_id UUID;
  success BOOLEAN := false;
  message TEXT := 'Update failed';
BEGIN
  -- Validate current user
  IF p_current_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = p_current_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid current user');
  END IF;

  -- Validate ownership
  SELECT user_id INTO target_user_id
  FROM agents
  WHERE id = p_agent_id AND user_id = p_current_user_id;

  IF target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Access denied or agent not found');
  END IF;

  -- Update the field
  UPDATE agents
  SET invoice_template_path = p_template_path
  WHERE id = p_agent_id;

  success := true;
  message := 'Template path updated successfully';

  RETURN json_build_object('success', success, 'message', message);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Update error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION update_agent_template_path(BIGINT, TEXT, UUID) TO authenticated;