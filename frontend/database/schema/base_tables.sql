-- Base tables for WhatsApp CRM schema
-- Based on the provided database structure

-- Users table for authentication (aligned with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id BIGSERIAL PRIMARY KEY,
    agent_prefix VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    created_by UUID NOT NULL,
    CONSTRAINT agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT agents_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- WhatsApp Configuration table
CREATE TABLE IF NOT EXISTS whatsapp_configuration (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    whatsapp_number VARCHAR(20) NOT NULL,
    webhook_url TEXT NOT NULL,
    api_key TEXT,
    business_account_id VARCHAR(100),
    phone_number_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_configuration_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Example Dynamic Agent Tables (for agt_6f78 agent)
-- These would be created dynamically for each agent in production

-- Customers table for specific agent
CREATE TABLE IF NOT EXISTS agt_6f78_customers (
    id SERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Messages table for specific agent
CREATE TABLE IF NOT EXISTS agt_6f78_messages (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES agt_6f78_customers(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Orders table for specific agent
CREATE TABLE IF NOT EXISTS agt_6f78_orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES agt_6f78_customers(id) ON DELETE CASCADE,
    order_details TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) on base tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configuration ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service role (full access)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON whatsapp_configuration FOR ALL USING (true) WITH CHECK (true);

-- Basic authenticated access policies
CREATE POLICY "Authenticated users can read users" ON users 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read agents" ON agents 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read whatsapp config" ON whatsapp_configuration 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Owner-based access for agents and whatsapp config
CREATE POLICY "Users can manage own agent data" ON agents 
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = created_by) 
    WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can manage own whatsapp config" ON whatsapp_configuration 
    FOR ALL USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);