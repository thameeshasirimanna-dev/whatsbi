-- Migration to add WhatsApp templates support
-- Create base table for pre-approved message templates

CREATE TYPE message_category AS ENUM ('utility', 'marketing', 'authentication');

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category message_category NOT NULL,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    body JSONB NOT NULL, -- WhatsApp template structure: {"name": "...", "language": {...}, "components": [...]}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to templates" ON whatsapp_templates 
FOR ALL USING (true) WITH CHECK (true);

-- User access to own templates
CREATE POLICY "Users can manage own templates" ON whatsapp_templates 
FOR ALL USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_category ON whatsapp_templates (user_id, category);
CREATE INDEX IF NOT EXISTS idx_templates_name ON whatsapp_templates (name);