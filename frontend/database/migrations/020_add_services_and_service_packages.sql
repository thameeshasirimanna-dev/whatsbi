-- Migration to create services and service_packages tables for all existing agents
-- Run after dynamic_table_creation.sql is applied

DO $$
DECLARE
    agent_record RECORD;
BEGIN
    -- Loop through all existing agents and create their tables if not exists
    FOR agent_record IN SELECT id, agent_prefix FROM agents LOOP
        PERFORM create_agent_tables(agent_record.agent_prefix, agent_record.id);
        RAISE NOTICE 'Created services and service_packages tables for agent: %', agent_record.agent_prefix;
    END LOOP;
END $$;