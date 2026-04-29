/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  webpack: (config, { dev }) => {
    if (dev) {
      // Disable filesystem cache in dev to prevent stale chunk ID crashes
      // after hot reloads (webpack-runtime loses track of old chunk files).
      config.cache = false;
    }
    return config;
  },

  async headers() {
    // CSP is intentionally permissive on script-src for now to support Next.js
    // inline scripts and RainbowKit. Tighten to nonce-based policy before adding
    // any third-party ad network tags — ad scripts are the highest XSS/wallet-drainer
    // risk vector. Restrict connect-src to only the origins the app actually talks to.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // tighten before ad integration
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      [
        "connect-src 'self'",
        "wss://arbitrance.com",
        "ws://arbitrance.com",
        "ws://localhost:3002",
        "ws://178.105.40.21",
        "ws://178.105.40.21/ws",
        "https://api.stripe.com",
        "https://mainnet.infura.io",
        "https://rpc.walletconnect.com",
        "https://relay.walletconnect.com",
        "wss://relay.walletconnect.com",
        "https://explorer-api.walletconnect.com",
      ].join(' '),
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // upgrade-insecure-requests intentionally omitted — breaks API fetches on HTTP-only deployments
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
