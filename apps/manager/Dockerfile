# Manager app Dockerfile for Railway deployment
# Cache bust: 2026-01-20-v2
FROM node:20-alpine AS builder

# Build-time args
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
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN pnpm --filter @madebuy/manager build

# Production stage
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy manager app
COPY --from=builder /app/apps/manager/.next ./apps/manager/.next
COPY --from=builder /app/apps/manager/public ./apps/manager/public
COPY --from=builder /app/apps/manager/package.json ./apps/manager/
COPY --from=builder /app/apps/manager/node_modules ./apps/manager/node_modules

# Copy packages (required for runtime)
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
# Let Railway provide PORT, default to 3399 for local testing
ENV PORT=3399

RUN chown -R nodejs:nodejs /app

USER nodejs

# Railway will override this port
EXPOSE 3399

# Remove Docker healthcheck - Railway handles healthchecks via /api/health path

WORKDIR /app/apps/manager
# Use sh -c to allow env var substitution
CMD ["sh", "-c", "pnpm start"]
