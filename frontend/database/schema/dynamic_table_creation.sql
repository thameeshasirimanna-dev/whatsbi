-- Dynamic Table Creation for Agent-Specific Data
-- Creates customers, messages, orders, appointments, invoices, templates, categories, and inventory_items tables for each agent based on their prefix
-- Run after base_tables.sql and enums.sql

-- Drop functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS create_agent_tables(TEXT, BIGINT) CASCADE;
DROP FUNCTION IF EXISTS create_agent_tables(TEXT) CASCADE;
DROP FUNCTION IF EXISTS drop_agent_tables(TEXT) CASCADE;
DROP FUNCTION IF EXISTS trigger_create_agent_tables() CASCADE;
DROP TRIGGER IF EXISTS trigger_create_agent_tables ON agents;

-- Generic function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_updated_at_column() TO service_role, authenticated;

-- Function to create agent-specific tables
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
BEGIN
    -- Create customers table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            profile_image_url TEXT,
            last_user_message_time TIMESTAMPTZ,
            ai_enabled BOOLEAN DEFAULT true,
            language TEXT DEFAULT ''english'',
            lead_stage lead_stage_enum DEFAULT ''New Lead'',
            interest_stage interest_stage_enum,
            conversion_stage conversion_stage_enum,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Agent can access own customers" ON %I;
        CREATE POLICY "Agent can access own customers" ON %I
            FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
    ', customers_table, p_agent_id, customers_table, customers_table, customers_table);

    -- Add to publication if not already added
    PERFORM add_to_publication_if_not_exists(customers_table);
    
    -- Create messages table for the agent with media support
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
        CREATE INDEX IF NOT EXISTS idx_%s_is_read ON %I (is_read) WHERE is_read = false;
        CREATE INDEX IF NOT EXISTS idx_%s_media_type ON %I (media_type);
        DROP POLICY IF EXISTS "Agent can access own messages" ON %I;
        CREATE POLICY "Agent can access own messages" ON %I
            FOR ALL USING (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())))
            WITH CHECK (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));
    ', messages_table, customers_table, messages_table, messages_table || '_messages', messages_table, messages_table || '_messages', messages_table, messages_table, messages_table, customers_table, customers_table);

    -- Add to publication if not already added
    PERFORM add_to_publication_if_not_exists(messages_table);
    
    -- Create orders table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            total_amount DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT ''pending'',
            notes TEXT,
            shipping_address TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Agent can access own orders" ON %I;
        CREATE POLICY "Agent can access own orders" ON %I
            FOR ALL USING (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())))
            WITH CHECK (EXISTS (SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())));
    ', orders_table, customers_table, orders_table, orders_table, orders_table, customers_table, customers_table);

    -- Add orders to publication if not already added
    PERFORM add_to_publication_if_not_exists(orders_table);
    
    -- Create order_items table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
            total NUMERIC GENERATED ALWAYS AS ((quantity)::NUMERIC * price) STORED,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%I_order_id ON %I (order_id);
    ', orders_table || '_items', orders_table, orders_table || '_items', orders_table || '_items', orders_table || '_items');

    -- Simplified RLS for order items - check via order's customer ownership
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
        COMMENT ON POLICY "Agent can access own order items" ON %I IS ''Allows agents to access and modify order items for customers they own via direct table joins'';
    ', orders_table || '_items', orders_table || '_items', orders_table, customers_table, orders_table, customers_table, orders_table || '_items', orders_table || '_items', orders_table || '_items');

    -- Add order_items to publication if not already added
    PERFORM add_to_publication_if_not_exists(orders_table || '_items');
 
    -- Create invoices table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            pdf_url TEXT NOT NULL,
            generated_at TIMESTAMPTZ DEFAULT now(),
            status VARCHAR(20) DEFAULT ''generated'' CHECK (status IN (''generated'', ''sent'', ''paid'')),
            discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%I_order_id ON %I (order_id);
        CREATE INDEX IF NOT EXISTS idx_%I_status ON %I (status);
        DROP POLICY IF EXISTS "Agent can access own invoices" ON %I;
        CREATE POLICY "Agent can access own invoices" ON %I
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
        GRANT ALL ON %I TO authenticated, service_role;
    ', orders_table || '_invoices', orders_table, orders_table || '_invoices', orders_table || '_invoices', orders_table || '_invoices', orders_table || '_invoices', orders_table || '_invoices', orders_table || '_invoices', orders_table || '_invoices', orders_table, customers_table, orders_table, customers_table, orders_table || '_invoices');

    -- Add invoices to publication if not already added
    PERFORM add_to_publication_if_not_exists(orders_table || '_invoices');
    
    -- Create appointments table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            appointment_date TIMESTAMPTZ NOT NULL,
            duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
            status VARCHAR(20) DEFAULT ''pending'' CHECK (status IN (''pending'', ''confirmed'', ''completed'', ''cancelled'')),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%I_customer_id ON %I (customer_id);
        CREATE INDEX IF NOT EXISTS idx_%I_appointment_date ON %I (appointment_date);
        CREATE INDEX IF NOT EXISTS idx_%I_status ON %I (status);
        DROP POLICY IF EXISTS "Agent can access own appointments" ON %I;
        CREATE POLICY "Agent can access own appointments" ON %I
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM %I ct WHERE ct.id = customer_id AND ct.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
                )
            );
    ', appointments_table, customers_table, appointments_table, appointments_table, appointments_table, appointments_table, appointments_table, appointments_table, appointments_table, appointments_table, appointments_table, customers_table, customers_table);

    -- Add to publication if not already added
    PERFORM add_to_publication_if_not_exists(appointments_table);
    
    -- Create templates table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            category message_category NOT NULL,
            language VARCHAR(10) NOT NULL DEFAULT ''en'',
            body JSONB NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Agent can access own templates" ON %I;
        CREATE POLICY "Agent can access own templates" ON %I
            FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
        CREATE INDEX IF NOT EXISTS idx_%s_category ON %I (category);
        CREATE INDEX IF NOT EXISTS idx_%s_name ON %I (name);
    ', templates_table, p_agent_id, templates_table, templates_table, templates_table, templates_table || '_templates', templates_table, templates_table || '_templates', templates_table);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_' || templates_table || '_agent_template') THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT unique_%s_agent_template UNIQUE (agent_id, name);', templates_table, templates_table);
    END IF;

    -- Add templates to publication if not already added
    PERFORM add_to_publication_if_not_exists(templates_table);

    -- Create categories table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE CHECK (name ~ ''^[a-zA-Z0-9 ]{1,50}$''),
            description TEXT,
            color VARCHAR(7) DEFAULT ''#000000'' CHECK (color ~ ''^#[0-9A-Fa-f]{6}$'' OR color = ''''),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS %s_name_idx ON %I (name);
        CREATE INDEX IF NOT EXISTS %s_color_idx ON %I (color);
        DROP POLICY IF EXISTS "Agent can access own categories" ON %I;
        CREATE POLICY "Agent can access own categories" ON %I
            FOR ALL USING (
                auth.uid() IN (
                    SELECT user_id FROM agents
                    WHERE agent_prefix = substring(%L from ''^(.+)_categories$'')
                )
            )
            WITH CHECK (
                auth.uid() IN (
                    SELECT user_id FROM agents
                    WHERE agent_prefix = substring(%L from ''^(.+)_categories$'')
                )
            );
    ', categories_table, categories_table,
       categories_table || '_name_idx', categories_table,
       categories_table || '_color_idx', categories_table,
       categories_table, categories_table, categories_table,
       categories_table, categories_table, categories_table);

    -- Add to publication if not already added
    PERFORM add_to_publication_if_not_exists(categories_table);

    -- Create inventory_items table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
            category_id INTEGER REFERENCES %I(id) ON DELETE SET NULL,
            sku VARCHAR(100),
            image_urls JSONB DEFAULT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%I_name ON %I (name);
        CREATE INDEX IF NOT EXISTS idx_%I_category_id ON %I (category_id);
        CREATE INDEX IF NOT EXISTS idx_%I_sku ON %I (sku);
        DROP POLICY IF EXISTS "Agent can access own inventory" ON %I;
        CREATE POLICY "Agent can access own inventory" ON %I
            FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
    ', inventory_table, p_agent_id, categories_table, inventory_table, inventory_table, inventory_table, inventory_table, inventory_table, inventory_table, inventory_table, inventory_table, inventory_table, inventory_table);

    -- Add to publication if not already added
    PERFORM add_to_publication_if_not_exists(inventory_table);

    -- Create services table for the agent
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agent_id BIGINT NOT NULL DEFAULT %L REFERENCES agents(id) ON DELETE CASCADE,
            service_name VARCHAR NOT NULL,
            description TEXT,
            image_urls JSONB DEFAULT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%s_service_name ON %I (service_name);
        DROP POLICY IF EXISTS "Agent can access own services" ON %I;
        CREATE POLICY "Agent can access own services" ON %I
            FOR ALL USING (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id))
            WITH CHECK (auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id));
    ', services_table, p_agent_id, services_table, services_table, services_table, services_table, services_table, services_table);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_' || services_table || '_agent_service_name') THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT unique_%s_agent_service_name UNIQUE (agent_id, service_name);', services_table, services_table);
    END IF;

    -- Add to publication if not already added
    PERFORM add_to_publication_if_not_exists(services_table);

    -- Create trigger for auto-updating updated_at on services
    EXECUTE format('
        DROP TRIGGER IF EXISTS update_updated_at ON %I;
        CREATE TRIGGER update_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    ', services_table, services_table);

    -- Create service_packages table for the agent
    RAISE NOTICE 'About to create service_packages table: %', service_packages_table;
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            service_id UUID NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
            package_name VARCHAR NOT NULL,
            price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
            currency VARCHAR(10) DEFAULT ''USD'',
            discount DECIMAL(5,2),
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE %I ADD CONSTRAINT unique_%s_service_package UNIQUE (service_id, package_name);
        ALTER TABLE %I ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS idx_%s_package_name ON %I (package_name);
        CREATE INDEX IF NOT EXISTS idx_%s_package_price ON %I (price);
        DROP POLICY IF EXISTS "Agent can access own service packages" ON %I;
    ', service_packages_table, services_table, service_packages_table, service_packages_table, service_packages_table, service_packages_table, service_packages_table, service_packages_table, service_packages_table, service_packages_table);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_' || service_packages_table || '_service_package') THEN
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT unique_%s_service_package UNIQUE (service_id, package_name);', service_packages_table, service_packages_table);
    END IF;

    RAISE NOTICE 'About to create policy for service_packages: %', service_packages_table;
    EXECUTE format('
        CREATE POLICY "Agent can access own service packages" ON %I
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM %I s
                    WHERE s.id = service_id
                    AND s.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM %I s
                    WHERE s.id = service_id
                    AND s.agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
                )
            );
    ', service_packages_table, services_table, services_table);
    RAISE NOTICE 'Policy created successfully for service_packages: %', service_packages_table;

    -- Add to publication if not already added
    PERFORM add_to_publication_if_not_exists(service_packages_table);

    -- Create trigger for auto-updating updated_at on service_packages
    EXECUTE format('
        DROP TRIGGER IF EXISTS update_updated_at ON %I;
        CREATE TRIGGER update_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    ', service_packages_table, service_packages_table);

    RAISE NOTICE 'Created tables and RLS policies for agent %', p_agent_prefix;
END;
$$;

-- Function to drop agent-specific tables (for agent deletion)
CREATE OR REPLACE FUNCTION drop_agent_tables(p_agent_prefix TEXT)
RETURNS TABLE(dropped_tables TEXT[], errors TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tables_to_drop TEXT[] := ARRAY[
        p_agent_prefix || '_customers',
        p_agent_prefix || '_messages',
        p_agent_prefix || '_orders',
        p_agent_prefix || '_appointments',
        p_agent_prefix || '_orders_items',
        p_agent_prefix || '_orders_invoices',
        p_agent_prefix || '_templates',
        p_agent_prefix || '_inventory_items',
        p_agent_prefix || '_categories',
        p_agent_prefix || '_services',
        p_agent_prefix || '_service_packages'
    ];
    dropped_tables TEXT[] := '{}';
    errors TEXT[] := '{}';
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY tables_to_drop
    LOOP
        BEGIN
            -- Drop table if exists with CASCADE
            EXECUTE format('DROP TABLE IF EXISTS "%s" CASCADE', table_name);
            dropped_tables := array_append(dropped_tables, table_name);
            RAISE NOTICE 'Dropped table: %', table_name;
        EXCEPTION WHEN OTHERS THEN
            errors := array_append(errors, table_name || ': ' || SQLERRM);
            RAISE NOTICE 'Failed to drop table %: %', table_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT dropped_tables, errors;
END;
$$;

-- Trigger function for automatic table creation on agent insert
CREATE OR REPLACE FUNCTION trigger_create_agent_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create tables for the new agent
    PERFORM create_agent_tables(NEW.agent_prefix, NEW.id);
    RETURN NEW;
END;
$$;

-- Create the trigger on agents table
CREATE TRIGGER trigger_create_agent_tables
    AFTER INSERT ON agents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_agent_tables();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_agent_tables(TEXT, BIGINT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION drop_agent_tables(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION trigger_create_agent_tables() TO service_role;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO service_role, authenticated;

-- Comments for documentation
COMMENT ON FUNCTION create_agent_tables IS 'Creates dynamic tables (customers, messages, orders, appointments, invoices, templates, categories, inventory_items, services, service_packages) for a new agent based on their prefix and ID. Uses generic update_updated_at_column() for timestamps.';
COMMENT ON FUNCTION drop_agent_tables IS 'Drops dynamic tables for a deleted agent based on their prefix';
COMMENT ON TRIGGER trigger_create_agent_tables ON agents IS 'Automatically creates agent-specific tables when a new agent is inserted';