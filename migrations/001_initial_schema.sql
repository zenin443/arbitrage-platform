-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false
);

-- Subscriptions table (links to Stripe)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan_tier VARCHAR(20) NOT NULL DEFAULT 'free'
    CHECK (plan_tier IN ('free', 'trader', 'pro', 'institutional')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_quote_currency VARCHAR(10) DEFAULT 'USDT',
  watchlist TEXT[] DEFAULT '{}',
  alert_enabled BOOLEAN DEFAULT false,
  theme VARCHAR(10) DEFAULT 'dark',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for JWT refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gap history archive
CREATE TABLE gap_history (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  buy_exchange VARCHAR(20) NOT NULL,
  sell_exchange VARCHAR(20) NOT NULL,
  gap_type VARCHAR(10) NOT NULL CHECK (gap_type IN ('CEX', 'DEX', 'S-F')),
  gross_spread DECIMAL(10, 4) NOT NULL,
  net_spread DECIMAL(10, 4) NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INTEGER,
  score VARCHAR(10)
);

-- Magnus trade log
CREATE TABLE magnus_trades (
  id BIGSERIAL PRIMARY KEY,
  strategy VARCHAR(20) NOT NULL DEFAULT 'alpha',
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('buy', 'sell', 'rebalance')),
  buy_exchange VARCHAR(20),
  sell_exchange VARCHAR(20),
  entry_price DECIMAL(20, 8),
  exit_price DECIMAL(20, 8),
  quantity DECIMAL(20, 8),
  profit_loss DECIMAL(20, 8),
  fees DECIMAL(20, 8),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_gap_history_symbol ON gap_history(symbol);
CREATE INDEX idx_gap_history_detected_at ON gap_history(detected_at);
CREATE INDEX idx_magnus_trades_executed_at ON magnus_trades(executed_at);
CREATE INDEX idx_magnus_trades_strategy ON magnus_trades(strategy);
