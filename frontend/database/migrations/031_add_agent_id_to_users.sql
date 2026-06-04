-- Migration: Add agent_id to users table and associate existing owners

ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_id BIGINT REFERENCES agents(id) ON DELETE SET NULL;

-- Associate existing agent users (owners) to their agents
UPDATE users u
SET agent_id = a.id
FROM agents a
WHERE a.user_id = u.id;
