module.exports = {
  apps: [
    {
      name: 'madebuy-admin',
      cwd: './apps/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3301',
      env: {
        NODE_ENV: 'production',
        PORT: 3301,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      time: true,
    },
    {
      name: 'madebuy-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3302',
      env: {
        NODE_ENV: 'production',
        PORT: 3302,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      time: true,
    },
  ],
}
