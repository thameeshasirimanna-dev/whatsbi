-- Migration to add support for WhatsApp messaging rules
-- Add last_user_message_time to all dynamic customers tables
-- Create global log table for message tracking

-- Function to add column to all *_customers tables
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE '%_customers' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS last_user_message_time TIMESTAMP WITH TIME ZONE', table_rec.tablename);
        RAISE NOTICE 'Added last_user_message_time to table: %', table_rec.tablename;
    END LOOP;
END $$;

-- Create global log table for WhatsApp messages
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id BIGINT REFERENCES agents(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- text, media, interactive, template
    category VARCHAR(50) NOT NULL, -- utility, marketing, authentication
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- sent, delivered, read, failed
    whatsapp_message_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on log table
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role full access
CREATE POLICY "Service role full access to logs" ON whatsapp_message_logs 
FOR ALL USING (true) WITH CHECK (true);

-- Policy for users to access own logs
CREATE POLICY "Users can manage own message logs" ON whatsapp_message_logs 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user_timestamp ON whatsapp_message_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_customer ON whatsapp_message_logs (customer_phone);