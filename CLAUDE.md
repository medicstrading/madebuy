# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

**MadeBuy** - Inventory management + social publishing for makers
- **Path:** ~/nuc-projects/madebuy
- **Domain:** madebuy.com.au
- **Tagline:** "Manage inventory, publish to social, sell from your storefront"
- **Ports:** Admin=3300, Web=3301

### Core Features
1. **Piece/Product Inventory** - CRUD, media, variations, COGS tracking
2. **Materials Inventory** - Track supplies, costs, invoice scanning
3. **Social Publishing** - Schedule posts via Late API + AI captions (OpenAI)
4. **Tenant Storefronts** - Individual seller shops with Stripe checkout
5. **Subscription Billing** - Stripe-based tier system

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

## Docker Development Environment

**CRITICAL:** Dev servers run in Docker containers locally. Code is mounted directly.

### Build Commands (MUST use docker exec)
```bash
# Find container name
docker ps --format '{{.Names}}' | grep madebuy

# Run build INSIDE container
docker exec madebuy-web-dev pnpm build
docker exec madebuy-admin-dev pnpm build

# Bundle analysis
docker exec madebuy-web-dev sh -c 'ANALYZE=true pnpm build'
```

### NEVER DO
- ❌ **Delete .next, dist, or build directories** - They're owned by container root
- ❌ Run `rm -rf` on any build artifacts
- ❌ Run builds on host (`pnpm build` locally or on NUC host)
- ❌ Suggest "cleaning" directories to fix permission issues

### If Build Fails
Report the error. Don't try to "fix" by deleting directories. The fix is usually:
1. Restart the Docker container
2. Or run the build inside the container with docker exec

## Architecture

### Monorepo Structure (pnpm workspaces)
```
apps/
  admin/     → Seller dashboard (Next.js 14, port 3300)
  web/       → Tenant storefronts + checkout (Next.js 14, port 3301)
packages/
  db/        → MongoDB repositories (all database access goes through here)
  shared/    → TypeScript types and constants
  storage/   → Cloudflare R2 image upload/retrieval
  social/    → Social media publishing (Late API + OpenAI)
```

### Multi-Tenancy Pattern

The web app uses dynamic routing for tenant storefronts:
- `/[tenant]/` → Individual seller storefront (e.g., `/handmade-jewelry/`)
- `/[tenant]/[slug]` → Product detail page
- `/[tenant]/cart` → Shopping cart
- `/[tenant]/checkout` → Stripe checkout

Tenants are identified by `slug` in URLs and `id` in the database. Each tenant has their own products (pieces), media, orders, etc.

### Database Layer (`@madebuy/db`)

All database operations use repository functions, never direct MongoDB access in routes:

```typescript
import { pieces, tenants, media } from '@madebuy/db'

// Repositories always require tenantId for data isolation
const allPieces = await pieces.listPieces(tenantId)
const piece = await pieces.createPiece(tenantId, data)
```

Collections: `tenants`, `pieces`, `media`, `orders`, `materials`, `customers`, `enquiries`, `publish_records`, `blog`

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
- `socialPublishing` - Post to social media (Maker+)
- `aiCaptions` - AI-generated captions (Pro+)
- `unlimitedPieces` - No product limit (Maker+)
- `customDomain` - Custom domain support (Pro+)

Feature flags stored in `tenant.features` object.

## Agents

Most agents are loaded from global `~/.claude/agents/`. Project-specific overrides:

| Agent | Location | Purpose |
|-------|----------|---------|
| deployment-reviewer | `.agents/domains/deployment/reviewer.md` | Next.js/Vercel pre-deploy checks |

**Quick deployment check:** `~/.claude/scripts/deploy-check.sh` (auto-detects Next.js)

**Remote build (faster):** `build-remote madebuy` or `bm` (runs on NUC directly)

---

## Git Push Permission (MANDATORY)

**NEVER push to GitHub without explicit user permission.**

- `git add` / `git commit` - OK without asking
- `git push` - **REQUIRES explicit permission**

**Permission phrases:** "push it", "push to github", "push to remote", "git push"

After committing, say: "Committed locally. Push to GitHub?" and **WAIT**.
