-- Add quote currency tracking to gap history
ALTER TABLE gap_history ADD COLUMN IF NOT EXISTS quote_currency VARCHAR(10) NOT NULL DEFAULT 'USDT';

CREATE INDEX IF NOT EXISTS idx_gap_history_quote_currency ON gap_history(quote_currency);
CREATE INDEX IF NOT EXISTS idx_gap_history_quote_detected  ON gap_history(quote_currency, detected_at DESC);
