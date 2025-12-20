-- Audit table for tracking user and agent updates
-- Run this before any functions that use it

-- Create audit log table if not exists (for tracking updates)
CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    updated_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON user_audit_log(user_id);

-- Grant permissions
GRANT ALL ON TABLE user_audit_log TO service_role, authenticated;

-- Comment for documentation
COMMENT ON TABLE user_audit_log IS 'Audit log for tracking user and agent updates with who made changes';