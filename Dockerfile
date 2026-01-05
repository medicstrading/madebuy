# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/admin/package.json ./apps/admin/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/storage/package.json ./packages/storage/
COPY packages/cloudflare/package.json ./packages/cloudflare/
COPY packages/scanner/package.json ./packages/scanner/
COPY packages/social/package.json ./packages/social/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build packages first, then apps
RUN pnpm --filter @madebuy/shared build || true
RUN pnpm --filter @madebuy/db build || true
RUN pnpm --filter @madebuy/storage build || true
RUN pnpm --filter @madebuy/cloudflare build || true
RUN pnpm --filter @madebuy/scanner build || true
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

# Copy apps
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
