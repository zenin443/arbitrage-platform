module.exports = {
  apps: [
    {
      name: 'arbitrance-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/arbitrance',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',   // kept as development so DEV_AUDIT_MODE works
        PORT: 3000,
      },
    },
    {
      name: 'arbitrance-server',
      script: 'node_modules/.bin/ts-node',
      args: '--project tsconfig.scripts.json server/priceServer.ts',
      cwd: '/opt/arbitrance',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
