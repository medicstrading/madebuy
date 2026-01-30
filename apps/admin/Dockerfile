# Admin app Dockerfile for Railway deployment
# Uses Next.js standalone output for proper PORT handling
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
RUN pnpm --filter @madebuy/storage build || true

# Build admin app in production mode
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN pnpm --filter @madebuy/admin build

# Debug: Show standalone structure
RUN echo "=== Standalone directory structure ===" && \
    ls -la /app/apps/admin/.next/standalone/ && \
    echo "=== Looking for server.js ===" && \
    find /app/apps/admin/.next/standalone -name "server.js" -type f

# Production stage - minimal image using standalone output
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

ENV NODE_ENV=production

# Copy the standalone output (includes minimal node_modules)
COPY --from=builder --chown=nodejs:nodejs /app/apps/admin/.next/standalone ./

# Copy static files
COPY --from=builder --chown=nodejs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

# Copy public folder
COPY --from=builder --chown=nodejs:nodejs /app/apps/admin/public ./apps/admin/public

# Debug: Show final structure
RUN echo "=== Final app structure ===" && ls -la /app && \
    echo "=== Looking for server.js ===" && find /app -name "server.js" -type f 2>/dev/null || echo "No server.js found"

USER nodejs

EXPOSE 3000

# The standalone server.js reads PORT and HOSTNAME env vars
CMD ["sh", "-c", "echo 'Starting admin server on port:' $PORT && HOSTNAME=0.0.0.0 node apps/admin/server.js"]
