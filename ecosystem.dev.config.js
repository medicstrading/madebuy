module.exports = {
  apps: [
    {
      name: 'madebuy-admin-dev',
      cwd: './apps/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 3301',
      env: {
        NODE_ENV: 'development',
        PORT: 3301,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/admin-dev-error.log',
      out_file: './logs/admin-dev-out.log',
      time: true,
    },
    {
      name: 'madebuy-web-dev',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 3302',
      env: {
        NODE_ENV: 'development',
        PORT: 3302,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/web-dev-error.log',
      out_file: './logs/web-dev-out.log',
      time: true,
    },
  ],
}
