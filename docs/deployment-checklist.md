# Arbitrance Platform — Deployment Checklist

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18+ | Use nvm or n for version management |
| npm | 9+ | Comes with Node.js 18 |
| PostgreSQL | 16 | `apt install postgresql-16` on Ubuntu |
| PM2 | latest | `npm install -g pm2` |
| Nginx | 1.24+ | `apt install nginx` |
| Certbot | latest | `apt install certbot python3-certbot-nginx` |

---

## 1. Environment Setup

Create `/var/www/arbitrance/.env.local` with:

```env
# Database
DATABASE_URL=postgresql://arbitrance_user:STRONG_PASSWORD@localhost:5432/arbitrance_db

# Auth
JWT_SECRET=<64-char random hex: openssl rand -hex 32>
JWT_REFRESH_SECRET=<64-char random hex: openssl rand -hex 32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://arbitrance.com
BACKEND_URL=http://localhost:3001

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your WalletConnect project ID>

# Stripe (if using card payments)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_TRADER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_INSTITUTIONAL=price_...

# Crypto payments
NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS=0x...
NEXT_PUBLIC_SOLANA_PAYMENT_WALLET=...
NEXT_PUBLIC_PAYMENT_CHAIN=base

# Server payment wallets (server-side only, no NEXT_PUBLIC_)
SERVER_PAYMENT_WALLET=0x...
SERVER_SOLANA_WALLET=...
```

---

## 2. Database Setup

```bash
# Create user and database
sudo -u postgres psql <<SQL
CREATE USER arbitrance_user WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE arbitrance_db OWNER arbitrance_user;
GRANT ALL PRIVILEGES ON DATABASE arbitrance_db TO arbitrance_user;
SQL

# Run migrations in order
psql "postgresql://arbitrance_user:STRONG_PASSWORD@localhost:5432/arbitrance_db" \
  -f migrations/001_initial.sql

psql "postgresql://arbitrance_user:STRONG_PASSWORD@localhost:5432/arbitrance_db" \
  -f migrations/002_wallet_address.sql

psql "postgresql://arbitrance_user:STRONG_PASSWORD@localhost:5432/arbitrance_db" \
  -f migrations/003_payments.sql
```

---

## 3. Application Build & Install

```bash
cd /var/www/arbitrance

# Install dependencies
npm ci --production=false

# Build Next.js
npm run build

# Verify build succeeded
ls -la .next/standalone 2>/dev/null || ls -la .next/server
```

---

## 4. PM2 Ecosystem Config

Create `ecosystem.config.js` at the project root:

```js
module.exports = {
  apps: [
    {
      name: 'arbitrance-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/arbitrance',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/arbitrance-web-err.log',
      out_file:   '/var/log/pm2/arbitrance-web-out.log',
      time: true,
    },
    {
      name: 'arbitrance-price-server',
      script: 'npx',
      args: 'ts-node --project tsconfig.server.json server/priceServer.ts',
      cwd: '/var/www/arbitrance',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/price-server-err.log',
      out_file:   '/var/log/pm2/price-server-out.log',
      time: true,
    },
  ],
};
```

```bash
# Start apps
pm2 start ecosystem.config.js

# Save process list for auto-restart on reboot
pm2 save
pm2 startup   # follow the printed sudo command
```

---

## 5. Nginx Configuration

Create `/etc/nginx/sites-available/arbitrance`:

```nginx
# Upstream definitions
upstream nextjs {
    server 127.0.0.1:3000;
}

upstream priceserver {
    server 127.0.0.1:3001;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name arbitrance.com www.arbitrance.com;
    return 301 https://$host$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name arbitrance.com www.arbitrance.com;

    # SSL (managed by Certbot)
    ssl_certificate     /etc/letsencrypt/live/arbitrance.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/arbitrance.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers (supplement Next.js headers)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Next.js app (port 3000)
    location / {
        proxy_pass         http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Price server REST API (port 3001)
    location /price-api/ {
        rewrite ^/price-api/(.*) /$1 break;
        proxy_pass         http://priceserver;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket price feed (port 3002)
    location /ws/ {
        proxy_pass         http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "Upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }
}
```

```bash
# Enable site and test config
ln -s /etc/nginx/sites-available/arbitrance /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 6. Let's Encrypt SSL

```bash
# Obtain certificate (temporarily stop nginx if needed)
certbot --nginx -d arbitrance.com -d www.arbitrance.com \
  --email hello@arbitrance.com --agree-tos --no-eff-email

# Auto-renewal (already set up by certbot, verify):
systemctl list-timers | grep certbot
# Or cron: 0 0,12 * * * certbot renew --quiet
```

---

## 7. Health Check Endpoints

| Endpoint | Expected | Description |
|---|---|---|
| `GET https://arbitrance.com/api/auth/me` | `401` | Next.js app is up |
| `GET http://localhost:3001/health` | `200 {"status":"ok"}` | Price server is up |
| `ws://localhost:3002` | WebSocket handshake | Price feed WebSocket |

```bash
# Quick health check script
curl -sf http://localhost:3001/health | python3 -m json.tool
curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me
```

---

## 8. Rollback Procedure

```bash
# 1. Identify the previous build tag / commit
git log --oneline -5

# 2. Stop current processes
pm2 stop all

# 3. Checkout previous version
git checkout <previous-commit-hash>
npm ci
npm run build

# 4. Restart
pm2 restart all

# 5. Database rollback (if schema changed)
# Migrations are append-only; to revert a migration:
psql "postgresql://arbitrance_user:STRONG_PASSWORD@localhost:5432/arbitrance_db" \
  -c "DROP TABLE IF EXISTS payments;"
# Then re-apply the correct migration if needed
```

---

## 9. Post-Deployment Verification

- [ ] `https://arbitrance.com` loads the home/login page
- [ ] `https://arbitrance.com/pricing` renders all 4 plan tiers
- [ ] Login with email/password returns a JWT
- [ ] `/api/auth/me` returns user data with valid token
- [ ] Price WebSocket connects from the browser
- [ ] Security headers present: `curl -I https://arbitrance.com | grep -E "X-Frame|X-Content|Referrer"`
- [ ] HTTPS redirect works: `curl -I http://arbitrance.com` → 301
- [ ] PM2 process list shows all apps `online`: `pm2 list`
