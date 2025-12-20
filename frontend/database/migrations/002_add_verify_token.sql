-- Migration: Add verify_token to whatsapp_configuration table
-- Run this in Supabase SQL Editor

-- Step 1: Add the verify_token column
ALTER TABLE whatsapp_configuration 
ADD COLUMN IF NOT EXISTS verify_token TEXT;

-- Step 2: Update the create_whatsapp_config function to include verify_token
DROP FUNCTION IF EXISTS create_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION create_whatsapp_config(
    p_user_id UUID,
    p_whatsapp_number VARCHAR(20),
    p_webhook_url TEXT,
    p_api_key TEXT DEFAULT NULL,
    p_business_account_id VARCHAR(100) DEFAULT NULL,
    p_phone_number_id VARCHAR(100) DEFAULT NULL,
    p_verify_token TEXT DEFAULT NULL
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
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN QUERY SELECT NULL::jsonb, false;
        RETURN;
    END IF;

    -- Insert into whatsapp_configuration (one per user)
    INSERT INTO whatsapp_configuration (
        user_id,
        whatsapp_number,
        webhook_url,
        api_key,
        business_account_id,
        phone_number_id,
        verify_token,
        is_active
    )
    VALUES (
        p_user_id,
        p_whatsapp_number,
        p_webhook_url,
        p_api_key,
        p_business_account_id,
        p_phone_number_id,
        p_verify_token,
        true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        whatsapp_number = EXCLUDED.whatsapp_number,
        webhook_url = EXCLUDED.webhook_url,
        api_key = EXCLUDED.api_key,
        business_account_id = EXCLUDED.business_account_id,
        phone_number_id = EXCLUDED.phone_number_id,
        verify_token = EXCLUDED.verify_token,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_config_id;

    -- Return the created/updated config
    RETURN QUERY
    SELECT
        row_to_json(wc.*)::jsonb,
        true
    FROM whatsapp_configuration wc
    WHERE wc.user_id = p_user_id;

END;
$$;

-- Step 3: Update the update_whatsapp_config function to include verify_token
DROP FUNCTION IF EXISTS update_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION update_whatsapp_config(
    p_user_id UUID,
    p_whatsapp_number VARCHAR(20) DEFAULT NULL,
    p_webhook_url TEXT DEFAULT NULL,
    p_api_key TEXT DEFAULT NULL,
    p_business_account_id VARCHAR(100) DEFAULT NULL,
    p_phone_number_id VARCHAR(100) DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_verify_token TEXT DEFAULT NULL
)
RETURNS TABLE (
    updated_config JSONB,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate user exists and has config
    IF NOT EXISTS (
        SELECT 1 
        FROM whatsapp_configuration wc 
        WHERE wc.user_id = p_user_id
    ) THEN
        RETURN QUERY SELECT NULL::jsonb, false;
        RETURN;
    END IF;

    -- Update only provided fields
    UPDATE whatsapp_configuration
    SET
        whatsapp_number = COALESCE(p_whatsapp_number, whatsapp_number),
        webhook_url = COALESCE(p_webhook_url, webhook_url),
        api_key = COALESCE(p_api_key, api_key),
        business_account_id = COALESCE(p_business_account_id, business_account_id),
        phone_number_id = COALESCE(p_phone_number_id, phone_number_id),
        verify_token = COALESCE(p_verify_token, verify_token),
        is_active = COALESCE(p_is_active, true),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- Return updated config
    RETURN QUERY
    SELECT
        row_to_json(wc.*)::jsonb,
        true
    FROM whatsapp_configuration wc
    WHERE wc.user_id = p_user_id;

END;
$$;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION create_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION update_whatsapp_config(UUID, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, BOOLEAN, TEXT) TO service_role, authenticated;

-- Step 5: Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_configuration' AND column_name = 'verify_token';

-- Note: After running this migration, update your frontend and backend code to include the verify_token field