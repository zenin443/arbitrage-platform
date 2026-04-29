#!/usr/bin/env bash
# ============================================================
# Arbitrance — Hetzner VPS Full Setup Script
# Run as root on a fresh Ubuntu 22.04 server
# Usage: bash setup-hetzner.sh
# ============================================================
set -euo pipefail

APP_DIR="/opt/arbitrance"
APP_USER="arbitrance"
REPO_URL=""          # ← fill in your git remote, e.g. git@github.com:yourorg/arbitrage-platform.git
NODE_VERSION="20"

echo "============================================"
echo "  Arbitrance VPS Setup — $(date)"
echo "============================================"

# ── 1. System Updates ────────────────────────────────────────
echo "[1/9] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Essential packages ────────────────────────────────────
echo "[2/9] Installing essentials..."
apt-get install -y -qq \
    curl git ufw nginx certbot python3-certbot-nginx \
    build-essential postgresql postgresql-contrib

# ── 3. Node.js via NodeSource ────────────────────────────────
echo "[3/9] Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
node -v && npm -v

# ── 4. PM2 globally ─────────────────────────────────────────
echo "[4/9] Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# ── 5. App user + directory ──────────────────────────────────
echo "[5/9] Setting up app directory at ${APP_DIR}..."
mkdir -p "$APP_DIR"

# ── 6. Clone or update repo ──────────────────────────────────
echo "[6/9] Deploying application code..."
if [ -d "${APP_DIR}/.git" ]; then
    echo "  → Repo exists, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    if [ -z "$REPO_URL" ]; then
        echo "  ⚠  REPO_URL is not set. Copying local files instead."
        echo "     Set REPO_URL at the top of this script and re-run, OR"
        echo "     manually copy your project files to ${APP_DIR}."
    else
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
fi

cd "$APP_DIR"

# ── 7. Environment file ──────────────────────────────────────
echo "[7/9] Checking .env file..."
if [ ! -f "${APP_DIR}/.env" ]; then
    echo "  ⚠  No .env found. Creating from template..."
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
    echo ""
    echo "  !! ACTION REQUIRED: Edit ${APP_DIR}/.env with real values before continuing!"
    echo "  !! Run: nano ${APP_DIR}/.env"
    echo ""
    exit 1
else
    echo "  → .env exists. Verifying DEV_AUDIT_MODE..."
    grep -q "DEV_AUDIT_MODE=true" .env && echo "  ✓ DEV_AUDIT_MODE=true" || \
        echo "DEV_AUDIT_MODE=true" >> .env
fi

# ── 8. Install deps + build ──────────────────────────────────
echo "[8/9] Installing npm dependencies and building..."
npm ci --prefer-offline
npm run build

# ── 9. Database setup ────────────────────────────────────────
echo "[9/9] Setting up PostgreSQL..."
# Create DB user and database (safe to run multiple times)
DB_PASS=$(openssl rand -hex 16)
sudo -u postgres psql -c "CREATE USER arbitrance WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE arbitrance OWNER arbitrance;" 2>/dev/null || true
echo ""
echo "  ✓ PostgreSQL ready."
echo "  → DB User: arbitrance"
echo "  → DB Pass: ${DB_PASS}  (add to .env as DATABASE_URL)"
echo "  → DATABASE_URL=postgresql://arbitrance:${DB_PASS}@localhost:5432/arbitrance"
echo ""

# ── Nginx setup ──────────────────────────────────────────────
echo "[nginx] Installing nginx config..."
cp "${APP_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/arbitrance
ln -sf /etc/nginx/sites-available/arbitrance /etc/nginx/sites-enabled/arbitrance
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  ✓ Nginx configured"

# ── Firewall ─────────────────────────────────────────────────
echo "[ufw] Opening ports 22, 80, 443..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo "  ✓ Firewall configured"

# ── Start app with PM2 ───────────────────────────────────────
echo "[pm2] Starting Arbitrance processes..."
cd "$APP_DIR"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "============================================"
echo "  ✅ Setup complete!"
echo "============================================"
echo ""
echo "  App:        http://$(curl -s ifconfig.me)"
echo "  PM2 status: pm2 list"
echo "  App logs:   pm2 logs"
echo "  Nginx logs: tail -f /var/log/nginx/error.log"
echo ""
echo "  Next steps:"
echo "  1. Update ${APP_DIR}/.env with correct DATABASE_URL, JWT_SECRET, etc."
echo "  2. Run migrations: cd ${APP_DIR} && npx ts-node scripts/migrate.ts"
echo "  3. Promote admin users: update users table role='admin'"
echo "  4. For HTTPS: certbot --nginx -d yourdomain.com"
echo ""
