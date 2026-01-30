#!/bin/sh
# Startup script for MadeBuy apps
# If APP_NAME is set, run single app; otherwise run all via PM2

set -e

if [ -n "$APP_NAME" ]; then
  echo "Starting single app: $APP_NAME"

  case "$APP_NAME" in
    admin)
      cd /app/apps/admin
      PORT=${PORT:-3300}
      echo "Starting admin on port $PORT"
      exec node node_modules/next/dist/bin/next start -p "$PORT" -H 0.0.0.0
      ;;
    web)
      cd /app/apps/web
      PORT=${PORT:-3301}
      echo "Starting web on port $PORT"
      exec node node_modules/next/dist/bin/next start -p "$PORT" -H 0.0.0.0
      ;;
    manager)
      cd /app/apps/manager
      PORT=${PORT:-3399}
      echo "Starting manager on port $PORT"
      exec node node_modules/next/dist/bin/next start -p "$PORT" -H 0.0.0.0
      ;;
    *)
      echo "Unknown APP_NAME: $APP_NAME"
      echo "Valid values: admin, web, manager"
      exit 1
      ;;
  esac
else
  echo "No APP_NAME set, starting all apps via PM2"
  exec pm2-runtime ecosystem.config.js
fi
