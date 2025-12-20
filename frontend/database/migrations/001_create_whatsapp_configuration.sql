-- Migration: Create separate whatsapp_configuration table
-- Run this in Supabase SQL Editor after backing up your database

-- Step 1: Create the new whatsapp_configuration table
CREATE TABLE IF NOT EXISTS whatsapp_configuration (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    whatsapp_number VARCHAR(20) NOT NULL,
    webhook_url TEXT NOT NULL,
    api_key TEXT,  -- For WhatsApp Business API or webhook auth
    business_account_id VARCHAR(100),  -- WhatsApp Business Account ID
    phone_number_id VARCHAR(100),  -- WhatsApp Phone Number ID
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)  -- One config per user/agent
);

-- Step 2: Enable RLS on the new table
ALTER TABLE whatsapp_configuration ENABLE ROW LEVEL SECURITY;

-- Step 3: Service role full access policy (no TO clause needed)
CREATE POLICY "Service role full access" ON whatsapp_configuration
    FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Authenticated users can read their own config
CREATE POLICY "Users can read own WhatsApp config" ON whatsapp_configuration
    FOR SELECT USING (auth.uid() = user_id);

-- Step 5: Users can update their own WhatsApp config
CREATE POLICY "Users can update own WhatsApp config" ON whatsapp_configuration
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 6: Index for performance
CREATE INDEX idx_whatsapp_config_user_id ON whatsapp_configuration(user_id);

-- Step 7: Migrate existing data from agents table to new table
-- ⚠️ BACKUP YOUR DATABASE FIRST! This moves data from agents.whatsapp_number and agents.webhook_url
INSERT INTO whatsapp_configuration (user_id, whatsapp_number, webhook_url, created_at)
SELECT 
    a.user_id,
    a.whatsapp_number,
    a.webhook_url,
    a.created_at
FROM agents a
WHERE a.whatsapp_number IS NOT NULL 
    AND a.webhook_url IS NOT NULL
    AND a.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 8: Verify migration (run this to check data moved correctly)
SELECT 
    'Migrated' as status,
    COUNT(*) as count
FROM whatsapp_configuration wc
JOIN agents a ON wc.user_id = a.user_id
WHERE wc.whatsapp_number = a.whatsapp_number
    AND wc.webhook_url = a.webhook_url;

-- Step 9: Clean up - Remove WhatsApp fields from agents table (run AFTER verifying migration)
-- ALTER TABLE agents DROP COLUMN IF EXISTS whatsapp_number;
-- ALTER TABLE agents DROP COLUMN IF EXISTS webhook_url;

-- Step 10: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_config_updated_at 
    BEFORE UPDATE ON whatsapp_configuration 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Grant service role execute permissions on the table for RPC functions
GRANT ALL ON whatsapp_configuration TO service_role;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_configuration_id_seq TO service_role;

-- Step 12: Verify RLS policies were created correctly
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'whatsapp_configuration'
ORDER BY policyname;