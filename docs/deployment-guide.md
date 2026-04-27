# Arbitrance SSL Deployment Guide

## Prerequisites

1. **DNS configured** — Point both `arbitrance.com` and `www.arbitrance.com` A records to your VPS IP address. DNS propagation must complete (typically 5–60 minutes) before running the script, otherwise Let's Encrypt's domain validation will fail.
2. **Root access** — The script must run as root on an Ubuntu/Debian VPS.
3. **Port 80 and 443 open** — Confirm your VPS firewall (e.g. `ufw`) allows inbound traffic on both ports.
4. **Project cloned on VPS** — The repo must exist at `/root/arbitrage-platform` so the script can copy the Nginx config.
5. **Node.js app already running** — The Next.js app should be running on `localhost:3000` (e.g. via PM2) before activating Nginx.

---

## Running the Deploy Script

SSH into the VPS as root, then:

```bash
chmod +x /root/arbitrage-platform/scripts/deploy-ssl.sh
/root/arbitrage-platform/scripts/deploy-ssl.sh
```

The script will:
- Install Nginx and Certbot
- Copy `nginx/arbitrance.conf` into Nginx's `sites-available` and enable it
- Remove the default Nginx site
- Test the Nginx config with `nginx -t`
- Obtain a Let's Encrypt certificate via the `--nginx` plugin and redirect HTTP → HTTPS automatically
- Enable the `certbot.timer` systemd unit for automatic renewal
- Reload Nginx

---

## Verifying SSL

Once the script completes, verify the certificate from any machine:

```bash
curl -I https://arbitrance.com
```

Expected output includes:

```
HTTP/2 200
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

You can also run a full SSL audit:

```bash
curl https://www.ssllabs.com/ssltest/analyze.html?d=arbitrance.com
```

Or check cert expiry directly:

```bash
echo | openssl s_client -connect arbitrance.com:443 -servername arbitrance.com 2>/dev/null \
  | openssl x509 -noout -dates
```

---

## Manual Certificate Renewal

Certbot auto-renewal is handled by `certbot.timer`. To trigger a manual renewal (e.g. to test):

```bash
certbot renew --dry-run        # test only, no cert written
certbot renew                  # force renewal (only renews if <30 days remaining)
systemctl reload nginx         # pick up the renewed cert
```

Check the timer status:

```bash
systemctl status certbot.timer
```

---

## Rollback Procedure

If something goes wrong after enabling SSL:

1. **Restore the default Nginx config:**

```bash
rm /etc/nginx/sites-enabled/arbitrance
ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

2. **Revoke the certificate (optional, only if needed):**

```bash
certbot revoke --cert-name arbitrance.com
```

3. **Re-enable the app over HTTP temporarily:**
   - Your Next.js app is still running on `localhost:3000`.
   - Point DNS back to an HTTP-only reverse proxy or access the VPS IP directly for debugging.

4. **Re-run the deploy script** once the issue is resolved:

```bash
/root/arbitrage-platform/scripts/deploy-ssl.sh
```

---

## Notes

- **HSTS preload** is set in Nginx (`max-age=63072000; includeSubDomains; preload`). Once the site is submitted to the [HSTS preload list](https://hstspreload.org/), browsers will enforce HTTPS even before the first request. Only submit after confirming SSL works correctly — removal from the list can take months.
- **`Strict-Transport-Security` is intentionally absent from `next.config.mjs`** — Nginx injects it at the edge so it is sent on the initial HTTPS handshake before Next.js is involved.
- **Local development is unaffected** — the Nginx config and this script are never loaded in the local dev environment (`next dev` over plain HTTP).
