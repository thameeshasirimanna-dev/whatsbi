-- WhatsApp Configuration Functions
-- Handles WhatsApp configuration creation, retrieval, updates, and deactivation
-- Run after base_tables.sql and enums.sql

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_whatsapp_config(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS delete_whatsapp_config(UUID) CASCADE;

-- Function 4: Create/Update WhatsApp Configuration
CREATE OR REPLACE FUNCTION create_whatsapp_config(
    p_user_id UUID,
    p_whatsapp_number VARCHAR(20),
    p_webhook_url TEXT,
    p_api_key TEXT DEFAULT NULL,
    p_business_account_id VARCHAR(100) DEFAULT NULL,
    p_phone_number_id VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    config JSONB,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config_id BIGINT;
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id LIMIT 1) THEN
        RETURN QUERY SELECT NULL::jsonb, false;
        RETURN;
    END IF;

    -- Insert or update whatsapp_configuration
    BEGIN
        INSERT INTO whatsapp_configuration (
            user_id, whatsapp_number, webhook_url, api_key,
            business_account_id, phone_number_id, is_active
        )
        VALUES (
            p_user_id, p_whatsapp_number, p_webhook_url, p_api_key,
            p_business_account_id, p_phone_number_id, true
        )
        ON CONFLICT (user_id) DO UPDATE SET
            whatsapp_number = EXCLUDED.whatsapp_number,
            webhook_url = EXCLUDED.webhook_url,
            api_key = EXCLUDED.api_key,
            business_account_id = EXCLUDED.business_account_id,
            phone_number_id = EXCLUDED.phone_number_id,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id INTO v_config_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create/update WhatsApp config for user %: %', p_user_id, SQLERRM;
        RETURN QUERY SELECT NULL::jsonb, false;
        RETURN;
    END;

    -- Return the config
    BEGIN
        RETURN QUERY
        SELECT row_to_json(wc.*)::jsonb, true
        FROM whatsapp_configuration wc
        WHERE wc.user_id = p_user_id LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to fetch WhatsApp config for user %: %', p_user_id, SQLERRM;
        RETURN QUERY SELECT NULL::jsonb, false;
    END;

END;
$$;

-- Function 5: Get WhatsApp Configuration
CREATE OR REPLACE FUNCTION get_whatsapp_config(
    p_user_id UUID
)
RETURNS TABLE (
    config JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT row_to_json(wc.*)::jsonb
    FROM whatsapp_configuration wc
    WHERE wc.user_id = p_user_id AND wc.is_active = true
    LIMIT 1;
END;
$$;

-- Function 6: Update WhatsApp Configuration
CREATE OR REPLACE FUNCTION update_whatsapp_config(
    p_user_id UUID,
    p_whatsapp_number VARCHAR(20) DEFAULT NULL,
    p_webhook_url TEXT DEFAULT NULL,
    p_api_key TEXT DEFAULT NULL,
    p_business_account_id VARCHAR(100) DEFAULT NULL,
    p_phone_number_id VARCHAR(100) DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    updated_config JSONB,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM whatsapp_configuration WHERE user_id = p_user_id LIMIT 1) THEN
        RETURN QUERY SELECT NULL::jsonb, false;
        RETURN;
    END IF;

    BEGIN
        UPDATE whatsapp_configuration
        SET
            whatsapp_number = COALESCE(p_whatsapp_number, whatsapp_number),
            webhook_url = COALESCE(p_webhook_url, webhook_url),
            api_key = COALESCE(p_api_key, api_key),
            business_account_id = COALESCE(p_business_account_id, business_account_id),
            phone_number_id = COALESCE(p_phone_number_id, phone_number_id),
            is_active = COALESCE(p_is_active, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;

        GET DIAGNOSTICS v_user_count = ROW_COUNT;
        IF v_user_count != 1 THEN
            RAISE NOTICE 'WhatsApp config update affected % rows (expected 1) for user %', v_user_count, p_user_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'WhatsApp config update failed for user %: %', p_user_id, SQLERRM;
        RETURN QUERY SELECT NULL::jsonb, false;
        RETURN;
    END;

    RETURN QUERY
    SELECT row_to_json(wc.*)::jsonb, true
    FROM whatsapp_configuration wc
    WHERE wc.user_id = p_user_id LIMIT 1;

END;
$$;

-- Function 7: Delete/Deactivate WhatsApp Configuration
CREATE OR REPLACE FUNCTION delete_whatsapp_config(
    p_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    BEGIN
        UPDATE whatsapp_configuration 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;

        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        
        IF v_rows_affected > 0 THEN
            RETURN QUERY SELECT true, 'WhatsApp configuration deactivated successfully';
        ELSE
            RETURN QUERY SELECT false, 'No WhatsApp configuration found for user';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'WhatsApp config deactivation failed for user %: %', p_user_id, SQLERRM;
        RETURN QUERY SELECT false, 'WhatsApp configuration deactivation failed';
    END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_config(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION update_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, BOOLEAN) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION delete_whatsapp_config(UUID) TO service_role, authenticated;

-- Comments for documentation
COMMENT ON FUNCTION create_whatsapp_config IS 'Creates or updates WhatsApp configuration for a user';
COMMENT ON FUNCTION get_whatsapp_config IS 'Retrieves active WhatsApp configuration for a user';
COMMENT ON FUNCTION update_whatsapp_config IS 'Updates WhatsApp configuration fields for a user';
COMMENT ON FUNCTION delete_whatsapp_config IS 'Deactivates WhatsApp configuration for a user';