-- Migration to drop base templates table and create dynamic templates for existing agents

-- Drop base table if exists
DROP TABLE IF EXISTS whatsapp_templates CASCADE;

-- Create dynamic templates tables for all existing agents
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT id, agent_prefix 
        FROM agents 
    LOOP
        PERFORM create_agent_tables(rec.agent_prefix, rec.id);
        RAISE NOTICE 'Created/verified tables for existing agent %', rec.agent_prefix;
    END LOOP;
END $$;