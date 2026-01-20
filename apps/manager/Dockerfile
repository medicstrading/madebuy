# Manager app Dockerfile for Railway deployment
# Uses Next.js standalone output for proper PORT handling
# Cache bust: 2026-01-20-v3
FROM node:20-alpine AS builder

# Build-time args for NEXT_PUBLIC_ env vars (baked into the build)
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.madebuy.online
ARG NEXT_PUBLIC_WEB_URL=https://madebuy.online

ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy everything from monorepo root
COPY . .

# Install dependencies
ENV NODE_ENV=development
RUN pnpm install

# Build packages first
RUN pnpm --filter @madebuy/shared build || true
RUN pnpm --filter @madebuy/db build || true

# Build manager app in production mode
# This will create .next/standalone with a minimal server.js
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN pnpm --filter @madebuy/manager build

# Production stage - minimal image using standalone output
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

ENV NODE_ENV=production
# PORT and HOSTNAME will be provided by Railway at runtime
# The standalone server.js automatically reads these env vars

# Copy the standalone output (includes minimal node_modules)
COPY --from=builder --chown=nodejs:nodejs /app/apps/manager/.next/standalone ./

# Copy static files to the standalone folder
# These need to be in .next/static relative to the server.js
COPY --from=builder --chown=nodejs:nodejs /app/apps/manager/.next/static ./apps/manager/.next/static

# Copy public folder to the standalone folder
COPY --from=builder --chown=nodejs:nodejs /app/apps/manager/public ./apps/manager/public

USER nodejs

# Railway will provide the actual port via PORT env var
EXPOSE 3000

# The standalone server.js automatically handles PORT and HOSTNAME env vars
# Run from the apps/manager directory where server.js is located
WORKDIR /app/apps/manager
CMD ["node", "server.js"]
