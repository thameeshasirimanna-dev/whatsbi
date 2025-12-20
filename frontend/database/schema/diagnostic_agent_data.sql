-- Diagnostic Function for Agent Data Integrity
-- Run this to diagnose data issues with specific agent_id

-- Function to check agent data integrity
CREATE OR REPLACE FUNCTION diagnose_agent_data(
    p_agent_id INTEGER
)
RETURNS TABLE (
    diagnostic_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'agent_id', p_agent_id,
        'agent_count', (SELECT COUNT(*) FROM agents WHERE id = p_agent_id),
        'agent_details', (SELECT json_agg(row_to_json(a)) FROM agents a WHERE a.id = p_agent_id),
        'distinct_user_ids', (SELECT COUNT(DISTINCT user_id) FROM agents WHERE id = p_agent_id),
        'user_ids', (SELECT json_agg(DISTINCT user_id) FROM agents WHERE id = p_agent_id),
        'user_count_for_primary_user', CASE 
            WHEN (SELECT user_id FROM agents WHERE id = p_agent_id LIMIT 1) IS NOT NULL THEN
                (SELECT COUNT(*) FROM users WHERE id = (SELECT user_id FROM agents WHERE id = p_agent_id LIMIT 1))
            ELSE 0
        END,
        'users_details', (SELECT json_agg(row_to_json(u)) FROM users u WHERE u.id IN (SELECT user_id FROM agents WHERE id = p_agent_id)),
        'auth_users_emails', (SELECT json_agg(row_to_json(au)) FROM auth.users au WHERE au.id IN (SELECT user_id FROM agents WHERE id = p_agent_id))
    ) INTO v_result;

    RETURN QUERY SELECT v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION diagnose_agent_data(INTEGER) TO service_role, authenticated;

-- Usage: SELECT * FROM diagnose_agent_data(41);
-- This will show if agent 41 has multiple entries, multiple user_ids, or user data issues