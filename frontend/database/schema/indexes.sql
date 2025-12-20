-- Performance indexes for the new WhatsApp CRM schema
-- Run after base_tables.sql and dynamic_table_creation.sql

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- Indexes for agents table
CREATE INDEX IF NOT EXISTS idx_agents_prefix ON agents (agent_prefix);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents (user_id);
CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents (created_by);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents (created_at);

-- Indexes for whatsapp_configuration table
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_user_id ON whatsapp_configuration (user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_active ON whatsapp_configuration (is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_whatsapp_number ON whatsapp_configuration (whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_updated_at ON whatsapp_configuration (updated_at);

-- Composite index for efficient whatsapp config queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_user_active ON whatsapp_configuration (user_id, is_active);

-- Indexes for dynamic agent tables (applied via trigger or manually for existing agents)
-- These indexes should be created for each agent's tables

-- Example indexes for agt_6f78 tables (repeat pattern for other agents)
CREATE INDEX IF NOT EXISTS idx_agt_6f78_customers_agent_id ON agt_6f78_customers (agent_id);
CREATE INDEX IF NOT EXISTS idx_agt_6f78_customers_phone ON agt_6f78_customers (phone);
CREATE INDEX IF NOT EXISTS idx_agt_6f78_customers_created_at ON agt_6f78_customers (created_at);

CREATE INDEX IF NOT EXISTS idx_agt_6f78_messages_customer_id ON agt_6f78_messages (customer_id);
CREATE INDEX IF NOT EXISTS idx_agt_6f78_messages_direction ON agt_6f78_messages (direction);
CREATE INDEX IF NOT EXISTS idx_agt_6f78_messages_timestamp ON agt_6f78_messages (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agt_6f78_orders_customer_id ON agt_6f78_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_agt_6f78_orders_status ON agt_6f78_orders (status);
CREATE INDEX IF NOT EXISTS idx_agt_6f78_orders_created_at ON agt_6f78_orders (created_at);

-- Composite indexes for efficient queries on dynamic tables
CREATE INDEX IF NOT EXISTS idx_agt_6f78_messages_customer_timestamp ON agt_6f78_messages (customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agt_6f78_orders_customer_status ON agt_6f78_orders (customer_id, status);

-- Function to create indexes for agent-specific tables
-- Call this after creating dynamic tables for optimal performance
CREATE OR REPLACE FUNCTION create_agent_indexes(p_agent_prefix TEXT)
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
    -- Create indexes for customers table
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_agent_id ON %I (agent_id)', 
                   p_agent_prefix, customers_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_customers_phone ON %I (phone)', 
                   p_agent_prefix, customers_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_customers_created_at ON %I (created_at)', 
                   p_agent_prefix, customers_table);
    
    -- Create indexes for messages table
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_messages_customer_id ON %I (customer_id)', 
                   p_agent_prefix, messages_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_messages_direction ON %I (direction)', 
                   p_agent_prefix, messages_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_messages_timestamp ON %I (timestamp DESC)', 
                   p_agent_prefix, messages_table);
    
    -- Create indexes for orders table
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_orders_customer_id ON %I (customer_id)', 
                   p_agent_prefix, orders_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_orders_status ON %I (status)', 
                   p_agent_prefix, orders_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_orders_created_at ON %I (created_at)', 
                   p_agent_prefix, orders_table);
    
    -- Composite indexes
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_messages_customer_timestamp ON %I (customer_id, timestamp DESC)', 
                   p_agent_prefix, messages_table);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_orders_customer_status ON %I (customer_id, status)', 
                   p_agent_prefix, orders_table);
    
    RAISE NOTICE 'Created indexes for agent % tables', p_agent_prefix;
END;
$$;

-- Grant execute permission for index creation function
GRANT EXECUTE ON FUNCTION create_agent_indexes(TEXT) TO service_role, authenticated;

-- Call index creation for existing agents (uncomment to run)
-- SELECT create_agent_indexes('agt_6f78');

-- Comments for documentation
COMMENT ON FUNCTION create_agent_indexes IS 'Creates performance indexes for agent-specific dynamic tables';