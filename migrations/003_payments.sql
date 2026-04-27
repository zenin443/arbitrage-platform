-- Crypto payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_tier VARCHAR(20) NOT NULL
    CHECK (plan_tier IN ('trader', 'pro', 'institutional')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL CHECK (currency IN ('USDC', 'USDT')),
  chain VARCHAR(20) NOT NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'wallet',
  tx_hash VARCHAR(255),
  from_address VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirming', 'confirmed', 'failed', 'expired')),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON payments(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
