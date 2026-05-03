CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  method       TEXT NOT NULL,
  path         TEXT NOT NULL,
  status_code  INTEGER NOT NULL,
  request_body JSONB,
  ip           INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id    ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

COMMENT ON TABLE admin_audit_log IS 'Immutable audit trail for all admin API actions. Never delete rows.';
