-- Migration: 039_add_sms_gateway_support.sql
-- Description: Adds Text.lk SMS Gateway configuration columns and updates broadcast tables to support SMS marketing

BEGIN;

-- 1. Add sms_sender_id and sms_api_token to whatsapp_configuration
ALTER TABLE public.whatsapp_configuration
  ADD COLUMN IF NOT EXISTS sms_sender_id TEXT,
  ADD COLUMN IF NOT EXISTS sms_api_token TEXT;

-- 2. Update create_agent_tables to support SMS in broadcasts
CREATE OR REPLACE FUNCTION create_agent_tables(p_agent_prefix TEXT, p_agent_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    customers_table TEXT := p_agent_prefix || '_customers';
    messages_table TEXT := p_agent_prefix || '_messages';
    orders_table TEXT := p_agent_prefix || '_orders';
    appointments_table TEXT := p_agent_prefix || '_appointments';
    templates_table TEXT := p_agent_prefix || '_templates';
    categories_table TEXT := p_agent_prefix || '_categories';
    inventory_table TEXT := p_agent_prefix || '_inventory_items';
    services_table TEXT := p_agent_prefix || '_services';
    service_packages_table TEXT := p_agent_prefix || '_service_packages';
    broadcasts_table TEXT := p_agent_prefix || '_broadcasts';
    broadcast_recipients_table TEXT := p_agent_prefix || '_broadcast_recipients';
BEGIN
    -- Base agent tables creation
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            profile_image_url TEXT,
            last_user_message_time TIMESTAMPTZ,
            ai_enabled BOOLEAN DEFAULT true,
            language TEXT DEFAULT ''english'',
            lead_stage lead_stage_enum DEFAULT ''New Lead'',
            interest_stage interest_stage_enum,
            conversion_stage conversion_stage_enum,
            lead_stage_note TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Agent can access own customers" ON %I;
        CREATE POLICY "Agent can access own customers" ON %I
            FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
    ', customers_table, p_agent_id, customers_table, customers_table, customers_table);

    PERFORM add_to_publication_if_not_exists(customers_table);

    -- Messages table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            direction VARCHAR NOT NULL CHECK (direction IN (''inbound'', ''outbound'')),
            timestamp TIMESTAMPTZ DEFAULT now(),
            is_read BOOLEAN DEFAULT false,
            media_type media_type DEFAULT ''none'',
            media_url TEXT,
            caption TEXT
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS %I ON %I (is_read) WHERE is_read = false;
        CREATE INDEX IF NOT EXISTS %I ON %I (media_type);
        CREATE INDEX IF NOT EXISTS %I ON %I (customer_id);
        CREATE INDEX IF NOT EXISTS %I ON %I (customer_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS %I ON %I (timestamp DESC);
        DROP POLICY IF EXISTS "Agent can access own messages" ON %I;
        CREATE POLICY "Agent can access own messages" ON %I
            FOR ALL USING (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())))
            WITH CHECK (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));
    ', messages_table, customers_table, messages_table,
       'idx_' || messages_table || '_is_read', messages_table,
       'idx_' || messages_table || '_media_type', messages_table,
       'idx_' || messages_table || '_customer_id', messages_table,
       'idx_' || messages_table || '_customer_timestamp', messages_table,
       'idx_' || messages_table || '_timestamp', messages_table,
       messages_table, messages_table, customers_table, customers_table);

    PERFORM add_to_publication_if_not_exists(messages_table);

    -- Broadcasts table with channel and sms support
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            channel VARCHAR(20) DEFAULT ''whatsapp'' CHECK (channel IN (''whatsapp'', ''sms'')),
            message_type VARCHAR(20) NOT NULL CHECK (message_type IN (''text'', ''template'', ''sms'')),
            template_name TEXT,
            template_language VARCHAR(10) DEFAULT ''en'',
            message TEXT,
            template_params JSONB DEFAULT NULL,
            header_params JSONB DEFAULT NULL,
            template_buttons JSONB DEFAULT NULL,
            media_header JSONB DEFAULT NULL,
            status VARCHAR(20) DEFAULT ''pending'' CHECK (status IN (''pending'', ''processing'', ''completed'', ''failed'')),
            total_recipients INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Agent can access own broadcasts" ON %I;
        CREATE POLICY "Agent can access own broadcasts" ON %I
            FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
        DROP TRIGGER IF EXISTS update_updated_at ON %I;
        CREATE TRIGGER update_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    ', broadcasts_table, p_agent_id, broadcasts_table, broadcasts_table, broadcasts_table, broadcasts_table, broadcasts_table);

    PERFORM add_to_publication_if_not_exists(broadcasts_table);

    -- Broadcast recipients table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            broadcast_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            customer_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            phone TEXT NOT NULL,
            status VARCHAR(20) DEFAULT ''pending'' CHECK (status IN (''pending'', ''sent'', ''failed'')),
            error_message TEXT,
            sent_at TIMESTAMPTZ
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS %I ON %I (broadcast_id);
        CREATE INDEX IF NOT EXISTS %I ON %I (customer_id);
        CREATE INDEX IF NOT EXISTS %I ON %I (status);
        DROP POLICY IF EXISTS "Agent can access own broadcast recipients" ON %I;
        CREATE POLICY "Agent can access own broadcast recipients" ON %I
            FOR ALL USING (EXISTS (SELECT 1 FROM %I b WHERE b.id = broadcast_id AND b.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())))
            WITH CHECK (EXISTS (SELECT 1 FROM %I b WHERE b.id = broadcast_id AND b.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));
    ', broadcast_recipients_table, broadcasts_table, customers_table,
       broadcast_recipients_table,
       'idx_' || broadcast_recipients_table || '_broadcast_id', broadcast_recipients_table,
       'idx_' || broadcast_recipients_table || '_customer_id', broadcast_recipients_table,
       'idx_' || broadcast_recipients_table || '_status', broadcast_recipients_table,
       broadcast_recipients_table, broadcast_recipients_table, broadcasts_table, broadcasts_table);

    PERFORM add_to_publication_if_not_exists(broadcast_recipients_table);
END;
$$;

-- 3. Upgrade all existing agent broadcast tables dynamically
DO $$
DECLARE
    r RECORD;
    b_table TEXT;
BEGIN
    FOR r IN SELECT agent_prefix FROM public.agents WHERE agent_prefix IS NOT NULL LOOP
        b_table := r.agent_prefix || '_broadcasts';
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = b_table) THEN
            -- Add channel column if not exists
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT ''whatsapp'';', b_table);
            -- Relax message_type check constraint to include 'sms'
            BEGIN
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I;', b_table, b_table || '_message_type_check');
                EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (message_type IN (''text'', ''template'', ''sms''));', b_table, b_table || '_message_type_check');
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END LOOP;
END;
$$;

COMMIT;
