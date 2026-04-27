-- Allow wallet-only users (no email/password required)
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42) UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Users must have EITHER email+password OR wallet_address (enforced in application logic)
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
