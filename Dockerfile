# Build stage
FROM node:20-alpine AS builder

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

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g pm2

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

EXPOSE 3301 3302

CMD ["pm2-runtime", "ecosystem.config.js"]
