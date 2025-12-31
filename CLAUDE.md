# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

**MadeBuy** - Multi-vendor marketplace for Australian makers (Etsy alternative)
- Domain: madebuy.com.au
- Tagline: "Shopify features + Etsy exposure, zero transaction fees"

## Commands

```bash
# Development (use these exact ports)
pnpm --filter admin dev --port 3300    # Admin dashboard
pnpm --filter web dev --port 3301      # Public marketplace

# Build
pnpm build                              # Build all
pnpm build:admin                        # Build admin only
pnpm build:web                          # Build web only

# Lint
pnpm lint

# Production (PM2)
pnpm pm2:start                          # Start all
pnpm pm2:logs                           # View logs
pnpm deploy:local                       # Build + restart

# Database
docker run -d --name madebuy-mongo -p 27017:27017 mongo:7    # Local MongoDB
pnpm create:tenant                      # Create test tenant
```

**Fixed ports:** Admin=3300, Web=3301 (do not use 3000/3001)

## Architecture

### Monorepo Structure (pnpm workspaces)
```
apps/
  admin/     → Seller dashboard (Next.js 14, port 3300)
  web/       → Public marketplace + tenant storefronts (Next.js 14, port 3301)
packages/
  db/        → MongoDB repositories (all database access goes through here)
  shared/    → TypeScript types and constants
  storage/   → Cloudflare R2 image upload/retrieval
  social/    → Social media publishing (Late API integration)
  marketplaces/ → Etsy integration
```

### Multi-Tenancy Pattern

The web app uses dynamic routing for tenant storefronts:
- `/[tenant]/` → Individual seller storefront (e.g., `/handmade-jewelry/`)
- `/[tenant]/[slug]` → Product detail page
- `/marketplace/` → Unified marketplace browse

Tenants are identified by `slug` in URLs and `id` in the database. Each tenant has their own products (pieces), media, orders, etc.

### Database Layer (`@madebuy/db`)

All database operations use repository functions, never direct MongoDB access in routes:

```typescript
import { pieces, tenants, media } from '@madebuy/db'

// Repositories always require tenantId for data isolation
const allPieces = await pieces.listPieces(tenantId)
const piece = await pieces.createPiece(tenantId, data)
```

Collections: `tenants`, `pieces`, `media`, `orders`, `materials`, `promotions`, `enquiries`, `publish_records`, `blog`

### Auth Pattern (Admin App)

NextAuth.js with credentials provider. Tenants authenticate via email/password:

```typescript
import { getCurrentTenant } from '@/lib/session'

export async function GET() {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // tenant.id is used for all data queries
}
```

### Types (`@madebuy/shared`)

All entity types are in `packages/shared/src/types/`:
- `Tenant` - Seller account with features, plan, branding
- `Piece` - Product/item for sale
- `Media` - Images stored in R2
- `Order`, `Material`, `Promotion`, etc.

Import types: `import type { Piece, Tenant } from '@madebuy/shared'`

### Storage (`@madebuy/storage`)

Images upload to Cloudflare R2. Media records in MongoDB reference R2 keys:

```typescript
import { uploadToR2, getSignedUrl } from '@madebuy/storage'
```

## Key Patterns

**API Routes:** Located in `apps/*/src/app/api/`. Follow Next.js 14 App Router conventions. Always check tenant auth first.

**Repository Pattern:** Database operations in `packages/db/src/repositories/`. Functions take `tenantId` as first param for multi-tenant isolation.

**Imports:** Use `@madebuy/db`, `@madebuy/shared`, `@madebuy/storage` for cross-package imports. Use `@/` for app-internal imports.

## Environment Variables

Required in `apps/admin/.env.local` and `apps/web/.env.local`:
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB` - Database name (usually `madebuy`)
- `NEXTAUTH_URL` - App URL (admin: localhost:3300, web: localhost:3301)
- `NEXTAUTH_SECRET` - Auth secret
- `R2_*` - Cloudflare R2 credentials

## Business Context

**Subscription tiers:** Free (10 products), Maker ($19), Pro ($39), Business ($79)

**Key features by tier:**
- `marketplaceListing` - Can list in unified marketplace (Maker+)
- `customDomain` - Custom domain support (Pro+)
- `unlimitedPieces` - No product limit (Maker+)

Feature flags stored in `tenant.features` object.
