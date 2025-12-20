-- Agent Deletion Function
-- Handles deleting agents, dropping dynamic tables, and deactivating WhatsApp config
-- Run after base_tables.sql and whatsapp_config_functions.sql

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS delete_agent(INTEGER) CASCADE;

-- Function 3: Delete Agent (drops dynamic tables and deactivates WhatsApp config)
CREATE OR REPLACE FUNCTION delete_agent(
    p_agent_id INTEGER
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_agent_prefix TEXT;
    v_user_id UUID;
BEGIN
    -- Safe fetch of agent details
    BEGIN
        SELECT agent_prefix, user_id INTO v_agent_prefix, v_user_id
        FROM agents WHERE id = p_agent_id LIMIT 1;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Agent not found';
            RETURN;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to fetch agent for deletion ID %: %', p_agent_id, SQLERRM;
        RETURN QUERY SELECT false, 'Failed to fetch agent for deletion';
        RETURN;
    END;

    -- Drop dynamic tables safely
    BEGIN
        PERFORM drop_agent_tables(v_agent_prefix);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to drop tables for prefix %: %', v_agent_prefix, SQLERRM;
        -- Continue with deletion even if table drop fails
    END;

    -- Delete agent record
    BEGIN
        DELETE FROM agents WHERE id = p_agent_id;
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Agent deletion failed - record not found';
            RETURN;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to delete agent ID %: %', p_agent_id, SQLERRM;
        RETURN QUERY SELECT false, 'Agent deletion failed';
        RETURN;
    END;

    -- Deactivate WhatsApp configuration if exists
    BEGIN
        UPDATE whatsapp_configuration 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to deactivate WhatsApp config for user %: %', v_user_id, SQLERRM;
        -- Continue with success even if WhatsApp deactivation fails
    END;

    RETURN QUERY SELECT true, 'Agent deleted successfully';

END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_agent(INTEGER) TO service_role, authenticated;

-- Comment for documentation
COMMENT ON FUNCTION delete_agent IS 'Deletes agent, drops dynamic tables, and deactivates WhatsApp config';