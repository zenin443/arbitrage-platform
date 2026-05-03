-- Whitelabel tenants: allows institutional users to have their own branded instance
CREATE TABLE IF NOT EXISTS whitelabel_tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(60)  NOT NULL UNIQUE,
  name          VARCHAR(200) NOT NULL,
  domain        VARCHAR(255),
  primary_color VARCHAR(20)  DEFAULT '#10b981',
  logo_url      TEXT,
  support_email VARCHAR(255),
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  config        JSONB        DEFAULT '{}',
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whitelabel_slug ON whitelabel_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_whitelabel_domain ON whitelabel_tenants(domain) WHERE domain IS NOT NULL;

-- Optionally link users to a tenant
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES whitelabel_tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;
