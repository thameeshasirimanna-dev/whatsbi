-- Agent Creation Function
-- Handles creating new agents with automatic dynamic table creation
-- Run after base_tables.sql and enums.sql

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS create_agent(UUID, VARCHAR, UUID) CASCADE;

-- Function 1: Create Agent with automatic table creation
CREATE OR REPLACE FUNCTION create_agent(
    p_user_id UUID,
    p_agent_prefix VARCHAR(20),
    p_created_by UUID
)
RETURNS TABLE (
    agent JSONB,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_agent_id BIGINT;
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN QUERY SELECT NULL::jsonb, false, 'User not found';
        RETURN;
    END IF;

    -- Validate creator exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_created_by) THEN
        RETURN QUERY SELECT NULL::jsonb, false, 'Creator not found';
        RETURN;
    END IF;

    -- Check if prefix already exists
    IF EXISTS (SELECT 1 FROM agents WHERE agent_prefix = p_agent_prefix) THEN
        RETURN QUERY SELECT NULL::jsonb, false, 'Agent prefix already exists';
        RETURN;
    END IF;

    -- Create agent
    INSERT INTO agents (user_id, agent_prefix, created_by)
    VALUES (p_user_id, p_agent_prefix, p_created_by)
    RETURNING id INTO v_agent_id;

    -- The trigger will automatically create the dynamic tables

    -- Return created agent
    RETURN QUERY
    SELECT row_to_json(a.*)::jsonb, true, 'Agent created successfully'
    FROM agents a
    WHERE a.id = v_agent_id;

END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_agent(UUID, VARCHAR, UUID) TO service_role, authenticated;

-- Comment for documentation
COMMENT ON FUNCTION create_agent IS 'Creates a new agent with automatic dynamic table creation';