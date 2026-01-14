# Build stage
FROM node:20-alpine AS builder

# Build-time args for NEXT_PUBLIC_* env vars (must be available during build)
ARG NEXT_PUBLIC_WEB_URL=https://madebuy.online
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.madebuy.online

# Set as env vars so Next.js bakes them into the client bundle
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy everything first
COPY . .

# Install ALL dependencies (dev + prod) for build
ENV NODE_ENV=development
RUN pnpm install

# Build packages
RUN pnpm --filter @madebuy/shared build || true
RUN pnpm --filter @madebuy/db build || true
RUN pnpm --filter @madebuy/storage build || true
RUN pnpm --filter @madebuy/social build || true

# Build apps
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN pnpm --filter @madebuy/admin build
RUN pnpm --filter @madebuy/web build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache ffmpeg
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g pm2

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy built assets
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy apps with standalone build
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/package.json ./apps/admin/
COPY --from=builder /app/apps/admin/node_modules ./apps/admin/node_modules

# Copy packages
COPY --from=builder /app/packages ./packages

# PM2 ecosystem file
COPY --from=builder /app/ecosystem.config.js ./

ENV NODE_ENV=production

# Create logs directory and set ownership
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports (admin=3300, web=3301)
EXPOSE 3300 3301

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3301/api/health || exit 1

CMD ["pm2-runtime", "ecosystem.config.js"]
