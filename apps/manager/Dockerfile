# Manager app Dockerfile for Railway deployment
# Uses Next.js standalone output for proper PORT handling
# Cache bust: 2026-01-30-v5-fix-nodeenv
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

# Install ALL dependencies (dev + prod) for build
# Note: Don't set NODE_ENV here - let pnpm install everything
RUN pnpm install

# Build packages first (these tolerate development mode)
RUN pnpm --filter @madebuy/shared build || true
RUN pnpm --filter @madebuy/db build || true

# Build manager app - explicitly set production mode for Next.js build
# Using shell form to ensure clean env for Next.js
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN NODE_ENV=production pnpm --filter @madebuy/manager build

# Debug: Show standalone structure
RUN echo "=== Standalone directory structure ===" && \
    ls -la /app/apps/manager/.next/standalone/ && \
    echo "=== Looking for server.js ===" && \
    find /app/apps/manager/.next/standalone -name "server.js" -type f

# Production stage - minimal image using standalone output
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

ENV NODE_ENV=production
# PORT and HOSTNAME will be provided by Railway at runtime
# The standalone server.js automatically reads these env vars

# Copy the standalone output (includes minimal node_modules)
# With outputFileTracingRoot set to monorepo root, structure mirrors the monorepo
COPY --from=builder --chown=nodejs:nodejs /app/apps/manager/.next/standalone ./

# Copy static files - they need to be in the right place relative to server.js
COPY --from=builder --chown=nodejs:nodejs /app/apps/manager/.next/static ./apps/manager/.next/static

# Copy public folder
COPY --from=builder --chown=nodejs:nodejs /app/apps/manager/public ./apps/manager/public

# Debug: Show final structure
RUN echo "=== Final app structure ===" && ls -la /app && \
    echo "=== Looking for server.js ===" && find /app -name "server.js" -type f 2>/dev/null || echo "No server.js found"

USER nodejs

# Railway will provide the actual port via PORT env var
EXPOSE 3000

# Debug: print PORT value and start server
# The standalone server.js should read PORT and HOSTNAME env vars
CMD ["sh", "-c", "echo 'PORT env var is:' $PORT && echo 'Starting server...' && HOSTNAME=0.0.0.0 node apps/manager/server.js"]
