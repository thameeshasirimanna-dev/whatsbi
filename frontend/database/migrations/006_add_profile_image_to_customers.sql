-- Migration: Add profile_image_url column to specific dynamic customer tables
-- Replace 'agt_3784_customers' with your actual table name if different

BEGIN;

-- Add profile_image_url column to agt_3784_customers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_catalog = current_database() 
        AND table_name = 'agt_3784_customers' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE agt_3784_customers ADD COLUMN profile_image_url TEXT;
        RAISE NOTICE 'Added profile_image_url column to agt_3784_customers';
    ELSE
        RAISE NOTICE 'Column profile_image_url already exists in agt_3784_customers';
    END IF;
END $$;

-- Add to other agent tables if needed (replace prefix)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_catalog = current_database() 
--         AND table_name = 'other_agent_prefix_customers' 
--         AND column_name = 'profile_image_url'
--     ) THEN
--         ALTER TABLE other_agent_prefix_customers ADD COLUMN profile_image_url TEXT;
--         RAISE NOTICE 'Added profile_image_url column to other_agent_prefix_customers';
--     ELSE
--         RAISE NOTICE 'Column profile_image_url already exists in other_agent_prefix_customers';
--     END IF;
-- END $$;

COMMIT;