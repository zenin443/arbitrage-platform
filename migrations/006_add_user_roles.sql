-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Valid values: 'user', 'admin'
-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comment for future devs
COMMENT ON COLUMN users.role IS 'User role: user (default) or admin (internal team only)';
