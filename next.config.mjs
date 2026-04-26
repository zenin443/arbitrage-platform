/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable filesystem cache in dev to prevent stale chunk ID crashes
      // after hot reloads (webpack-runtime loses track of old chunk files).
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
