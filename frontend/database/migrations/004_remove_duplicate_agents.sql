-- Migration to remove duplicate agents and ensure data integrity
-- Run this after identifying duplicate agent records

-- Step 1: Identify duplicates (for verification)
SELECT 
    id, 
    agent_prefix, 
    user_id, 
    created_by, 
    created_at,
    COUNT(*) over (PARTITION BY agent_prefix, user_id) as duplicate_count
FROM agents 
GROUP BY id, agent_prefix, user_id, created_by, created_at 
HAVING COUNT(*) over (PARTITION BY agent_prefix, user_id) > 1
ORDER BY agent_prefix, created_at;

-- Step 2: Delete duplicates, keeping the earliest record for each agent_prefix
DELETE FROM agents 
WHERE id NOT IN (
    SELECT min_id 
    FROM (
        SELECT 
            MIN(id) as min_id,
            agent_prefix
        FROM agents 
        GROUP BY agent_prefix
    ) as earliest_records
)
AND agent_prefix IN (
    -- Only delete from groups that have duplicates
    SELECT agent_prefix 
    FROM agents 
    GROUP BY agent_prefix 
    HAVING COUNT(*) > 1
);

-- Step 3: Verify no duplicates remain
SELECT 
    agent_prefix, 
    COUNT(*) as count
FROM agents 
GROUP BY agent_prefix 
HAVING COUNT(*) > 1;

-- Step 4: Add explicit unique constraint on (user_id, agent_prefix) if not exists
-- This prevents future duplicates based on business logic
ALTER TABLE agents 
ADD CONSTRAINT IF NOT EXISTS agents_user_prefix_unique 
UNIQUE (user_id, agent_prefix);

-- Step 5: Clean up any orphaned dynamic tables (optional - run manually if needed)
-- This would require knowing the agent_prefixes that were deleted
-- Example: PERFORM drop_agent_tables('duplicate_prefix_name');