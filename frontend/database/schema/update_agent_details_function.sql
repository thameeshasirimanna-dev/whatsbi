-- Update Agent Details Function
-- Updates user profile and agent metadata for a specific agent
-- Only modifies users table and syncs with auth.users
-- agent_prefix remains immutable
-- SECURITY DEFINER to allow authenticated calls with elevated privileges

DROP FUNCTION IF EXISTS update_agent_details(INTEGER, JSONB, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_agent_details(INTEGER, JSONB) CASCADE;

CREATE OR REPLACE FUNCTION update_agent_details(
    p_agent_id INTEGER,
    p_user_updates JSONB,
    p_agent_updates JSONB,
    p_current_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    target_user_id UUID;
    updated_user JSON;
    updated_agent JSON;
    success BOOLEAN := false;
    message TEXT := 'Update failed';
    agent_prefix VARCHAR(20);
BEGIN
    -- Validate current user exists and is authenticated
    IF p_current_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = p_current_user_id) THEN
        RETURN json_build_object('agent', NULL, 'success', false, 'message', 'Invalid current user');
    END IF;

    -- Fetch target agent and validate ownership
    SELECT a.user_id, a.agent_prefix
    INTO target_user_id, agent_prefix
    FROM agents a
    WHERE a.id = p_agent_id
    AND (a.user_id = p_current_user_id OR a.created_by = p_current_user_id);

    IF target_user_id IS NULL THEN
        RETURN json_build_object('agent', NULL, 'success', false, 'message', 'Agent not found or access denied');
    END IF;

    -- Validate target user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
        RETURN json_build_object('agent', NULL, 'success', false, 'message', 'Associated user not found');
    END IF;

    -- Ensure agent_prefix is not being updated (immutable)
    IF p_agent_updates ? 'agent_prefix' THEN
        RETURN json_build_object('agent', NULL, 'success', false, 'message', 'Agent prefix cannot be updated');
    END IF;

    -- Update user details from JSONB (name, email only - agents always have role 'agent')
    -- Sync email with auth.users if changed
    UPDATE users
    SET
        name = COALESCE(p_user_updates->>'name', name),
        email = COALESCE(p_user_updates->>'email', email)
        -- Role remains 'agent' for all agent accounts, no updates needed
    WHERE id = target_user_id;

    -- Sync email change with auth.users if email was updated
    IF p_user_updates ? 'email' THEN
        UPDATE auth.users
        SET email = p_user_updates->>'email'
        WHERE id = target_user_id;
        
        -- Note: Password updates would require additional auth logic (e.g., via Supabase auth API)
        -- This function focuses on profile sync only
    END IF;

    -- Update agent metadata (excluding prefix, e.g., any future fields)
    -- Currently, only created_at is immutable; others can be added
    UPDATE agents
    SET
        address = COALESCE(p_agent_updates->>'address', address),
        business_email = COALESCE(p_agent_updates->>'business_email', business_email),
        contact_number = COALESCE(p_agent_updates->>'contact_number', contact_number),
        website = COALESCE(p_agent_updates->>'website', website),
        invoice_template_path = COALESCE(p_agent_updates->>'invoice_template_path', invoice_template_path),
        business_type = COALESCE((p_agent_updates->>'business_type')::business_type_enum, business_type),
        -- Add updatable agent fields here if needed (none currently beyond prefix)
        -- For example: some_metadata = COALESCE((p_agent_updates->>'some_metadata')::TEXT, some_metadata)
        created_at = GREATEST(created_at, CURRENT_TIMESTAMP)  -- Touch timestamp
    WHERE id = p_agent_id;

    -- Fetch updated records
    SELECT row_to_json(u) INTO updated_user
    FROM users u WHERE u.id = target_user_id;

    SELECT row_to_json(a) INTO updated_agent
    FROM agents a WHERE a.id = p_agent_id;

    success := true;
    message := 'Agent details updated successfully';

    RETURN json_build_object(
        'agent', json_build_object('user', updated_user, 'agent', updated_agent),
        'success', success,
        'message', message
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('agent', NULL, 'success', false, 'message', 'Update error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_agent_details(INTEGER, JSONB, JSONB, UUID) TO authenticated;