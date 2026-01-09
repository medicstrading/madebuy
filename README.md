# MadeBuy - Multi-tenant E-commerce Platform

An Etsy alternative marketplace for makers - Shopify features + Etsy exposure, zero transaction fees.

**Target:** Handmade businesses wanting professional storefronts without platform lock-in.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start MongoDB
docker run -d --name madebuy-mongo -p 27017:27017 mongo:7

# 3. Copy environment files
cp apps/admin/.env.example apps/admin/.env.local
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local files with your values

# 4. Run development servers
pnpm --filter admin dev --port 3300    # Admin: http://localhost:3300
pnpm --filter web dev --port 3301      # Web: http://localhost:3301

# 5. Create a test tenant
pnpm create:tenant
```

**Fixed Ports:** Admin=3300, Web=3301 (do not use 3000/3001)

---

## Architecture

### Monorepo Structure

```
madebuy/
├── apps/
│   ├── admin/          # Seller dashboard (Next.js 14, port 3300)
│   └── web/            # Tenant storefronts + checkout (Next.js 14, port 3301)
└── packages/
    ├── db/             # MongoDB repositories (multi-tenant)
    ├── shared/         # TypeScript types and utilities
    ├── social/         # Social media publishing (Late API + OpenAI)
    ├── storage/        # Cloudflare R2 image upload
    └── rate-limit/     # Redis/in-memory rate limiting
```

### Multi-Tenancy Pattern

The web app uses dynamic routing for tenant storefronts:

```
/[tenant]/              → Individual seller storefront (e.g., /handmade-jewelry/)
/[tenant]/[slug]        → Product detail page
/[tenant]/cart          → Shopping cart
/[tenant]/checkout      → Stripe checkout
```

Tenants are identified by `slug` in URLs and `id` in the database. Each tenant has isolated:
- Products (pieces)
- Media
- Orders
- Customers
- Settings

**Data Isolation:** Every database query is scoped by `tenantId` - there are no collection-wide operations.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Database | MongoDB |
| Storage | Cloudflare R2 |
| Payments | Stripe + Stripe Connect |
| Email | Resend |
| Auth | NextAuth.js |
| Styling | Tailwind CSS |
| Monorepo | pnpm workspaces + Turborepo |

---

## Core Features

### Seller Dashboard (Admin App)

| Feature | Description |
|---------|-------------|
| Inventory Management | Products with variants, stock tracking, COGS |
| Materials Tracking | Supply costs, usage reports, reorder alerts |
| Media Library | Image/video upload to R2, variants, blur placeholders |
| Order Management | Lifecycle tracking, status updates, exports |
| Customer Management | Accounts, addresses, purchase history |
| Social Publishing | Schedule posts via Late API with AI captions |
| Blog | SEO-optimized content for storefronts |
| Analytics | Sales, traffic, conversion funnels |

### Customer Storefront (Web App)

| Feature | Description |
|---------|-------------|
| Multi-tenant Routing | `/{tenant}` dynamic storefronts |
| Product Catalog | Grid/list views, filtering, search |
| Shopping Cart | Persistent, quantity management |
| Stripe Checkout | Secure payment processing |
| Order Confirmation | Email notifications |
| Reviews | Customer ratings and feedback |
| Wishlists | Save for later |

---

## Subscription Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 10 products, basic storefront |
| **Maker** | $19/mo | Unlimited products, social publishing |
| **Pro** | $39/mo | AI captions, custom domain, API access |
| **Business** | $79/mo | Advanced analytics, priority support |

Feature flags stored in `tenant.features`:
- `socialPublishing` - Post to social media
- `aiCaptions` - AI-generated captions
- `unlimitedPieces` - No product limit
- `customDomain` - Custom domain support
- `apiAccess` - API for integrations
- `advancedAnalytics` - Detailed reporting

---

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+
- MongoDB 7+ (local or Atlas)
- Docker (for development environment)

### Local Development

```bash
# Install dependencies
pnpm install

# Run both apps
pnpm dev

# Run specific app
pnpm --filter admin dev --port 3300
pnpm --filter web dev --port 3301

# Build all
pnpm build

# Lint
pnpm lint

# Run tests
pnpm test
```

### Docker Development (NUC)

Dev servers run in Docker containers. Code is mounted via SSHFS.

```bash
# Find container name
ssh nuc-dev "docker ps --format '{{.Names}}' | grep madebuy"

# Run build INSIDE container
ssh nuc-dev "docker exec madebuy-web-dev pnpm build"
ssh nuc-dev "docker exec madebuy-admin-dev pnpm build"

# Restart containers
nuc-docker restart madebuy

# View logs
nuc-docker logs madebuy-web-dev
```

**NEVER DO:**
- Delete .next, dist, or build directories (owned by container root)
- Run `rm -rf` on build artifacts
- Run builds on host directly

---

## Environment Variables

See [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) for complete reference.

### Quick Setup

**Admin App** (`apps/admin/.env.local`):
```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=madebuy
NEXTAUTH_URL=http://localhost:3300
NEXTAUTH_SECRET=your-secret-here

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=madebuy
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Optional
OPENAI_API_KEY=sk-xxx          # AI captions
LATE_API_KEY=xxx               # Social publishing
REDIS_URL=redis://localhost:6379  # Rate limiting
```

**Web App** (`apps/web/.env.local`):
```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=madebuy

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PUBLISHABLE_KEY=pk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Storage
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Optional
RESEND_API_KEY=re_xxx
REDIS_URL=redis://localhost:6379
```

---

## Production Deployment

### PM2 (VPS/Dedicated)

```bash
# Install PM2
npm install -g pm2

# Build and start
pnpm build
pnpm pm2:start

# Management
pnpm pm2:status    # View status
pnpm pm2:logs      # View logs
pnpm pm2:restart   # Restart apps
pnpm deploy:local  # Build + restart
```

### Auto-start on Boot

```bash
pm2 startup
pm2 save
```

### Stripe Connect Setup (Required)

1. Get API keys from https://dashboard.stripe.com/apikeys
2. Create webhook endpoint:
   - URL: `https://madebuy.com.au/api/webhooks/stripe-connect`
   - Events: `account.updated`, `account.application.deauthorized`, `payout.paid`, `payout.failed`, `charge.dispute.created`
3. Add webhook secret to environment

---

## Package Documentation

| Package | README |
|---------|--------|
| @madebuy/db | [packages/db/README.md](packages/db/README.md) |
| @madebuy/shared | [packages/shared/README.md](packages/shared/README.md) |
| @madebuy/storage | [packages/storage/README.md](packages/storage/README.md) |
| @madebuy/social | [packages/social/README.md](packages/social/README.md) |

---

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### TypeScript Errors

```bash
# Check types
pnpm tsc --noEmit

# Rebuild packages first
cd packages/shared && pnpm build
cd packages/db && pnpm build
```

### MongoDB Connection

```bash
# Verify connection
mongosh "mongodb://localhost:27017"

# Check if running
docker ps | grep mongo

# Start MongoDB
docker run -d --name madebuy-mongo -p 27017:27017 mongo:7
```

### Docker Build Issues

```bash
# Don't delete .next directories - restart container instead
ssh nuc-dev "docker restart madebuy-web-dev"

# View container logs
ssh nuc-dev "docker logs madebuy-web-dev --tail 100"
```

### Rate Limiting (Redis)

```bash
# Start Redis locally
docker run -d --name redis -p 6379:6379 redis:7

# Or use in-memory fallback (automatic when Redis unavailable)
```

---

## Development Workflow

### Adding a New Feature

1. Create types in `packages/shared/src/types/`
2. Add repository in `packages/db/src/repositories/`
3. Export from `packages/db/src/index.ts`
4. Add validation schemas in `packages/shared/src/validation/`
5. Create API routes in `apps/admin/src/app/api/`
6. Build UI components
7. Add tests

### Code Style

- Use TypeScript strict mode
- No `any` types (use proper types from @madebuy/shared)
- Repository functions take `tenantId` as first parameter
- Use Zod for API input validation
- Use logger from @madebuy/shared (not console.log)

### Git Workflow

- Commit often with descriptive messages
- Reference spec IDs: `fix: Spec 028 - Add DB package documentation`
- Don't push without explicit permission

---

## Contributing

This is a private repository. Contact the maintainer for access.

### Code Review Checklist

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No console.log statements
- [ ] API routes have Zod validation
- [ ] Multi-tenant isolation maintained
- [ ] Rate limiting on public endpoints

---

## License

Private - MadeBuy Pty Ltd. All rights reserved.
