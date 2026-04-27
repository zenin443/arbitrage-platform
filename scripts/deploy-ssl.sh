#!/bin/bash
set -e
DOMAIN="arbitrance.com"
EMAIL="hello@arbitrance.com"
apt update
apt install -y nginx certbot python3-certbot-nginx
cp /root/arbitrage-platform/nginx/arbitrance.conf /etc/nginx/sites-available/arbitrance
ln -sf /etc/nginx/sites-available/arbitrance /etc/nginx/sites-enabled/arbitrance
rm -f /etc/nginx/sites-enabled/default
nginx -t
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
systemctl enable certbot.timer
systemctl start certbot.timer
systemctl reload nginx
echo "SSL setup complete. Visit https://$DOMAIN"
