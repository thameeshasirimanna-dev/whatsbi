-- Migration to fix syntax error in create_agent_tables function
-- Moves DEFAULT clause before REFERENCES in customers table creation

BEGIN;

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
BEGIN
    -- Create customers table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Agent can access own customers" ON %I;
        CREATE POLICY "Agent can access own customers" ON %I
            FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
    ', customers_table, p_agent_id, customers_table, customers_table, customers_table);
    
    -- Create messages table for the agent with is_read column
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            direction VARCHAR(10) NOT NULL CHECK (direction IN (''inbound'', ''outbound'')),
            timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            is_read BOOLEAN DEFAULT false
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%I_is_read ON %I (is_read) WHERE is_read = false;
        DROP POLICY IF EXISTS "Agent can access own messages" ON %I;
        CREATE POLICY "Agent can access own messages" ON %I
            FOR ALL USING (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())))
            WITH CHECK (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));
    ', messages_table, customers_table, messages_table, messages_table, messages_table, messages_table, messages_table, customers_table, customers_table);
    
    -- Create orders table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            total_amount DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT ''pending'',
            notes TEXT,
            shipping_address TEXT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Agent can access own orders" ON %I;
        CREATE POLICY "Agent can access own orders" ON %I
            FOR ALL USING (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())))
            WITH CHECK (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));
    ', orders_table, customers_table, orders_table, orders_table, orders_table, customers_table, customers_table);
    
    -- Create order_items table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
            total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price) STORED,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%I_order_id ON %I (order_id);
    ', orders_table || '_items', orders_table, orders_table || '_items', orders_table || '_items', orders_table || '_items');
    
    -- RLS for order items
    EXECUTE format('
        DROP POLICY IF EXISTS "Agent can access own order items" ON %I;
        CREATE POLICY "Agent can access own order items" ON %I
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM %I o
                    JOIN %I c ON c.id = o.customer_id
                    WHERE o.id = order_id
                    AND c.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM %I o
                    JOIN %I c ON c.id = o.customer_id
                    WHERE o.id = order_id
                    AND c.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
                )
            );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON %I TO authenticated, service_role;
    ', orders_table || '_items', orders_table || '_items', orders_table, customers_table, orders_table, customers_table, orders_table || '_items', orders_table || '_items');
    
    RAISE NOTICE 'Created tables and RLS policies for agent %', p_agent_prefix;
END;
$$;

COMMIT;