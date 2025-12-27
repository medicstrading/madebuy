# MadeBuy - Project Configuration

## ⛔ PROJECT IDENTITY - READ FIRST

**This is:** MadeBuy - Etsy Alternative Marketplace for Makers
**This is NOT:** Loutan Beauty, Sara's jewelry site, sarasite

**Tagline:** "Shopify features + Etsy exposure, zero transaction fees"
**Domain:** madebuy.com.au
**Path:** ~/c/madebuy

---

## 🔒 PORTS (FIXED)

| App | Port | URL | Start Command |
|-----|------|-----|---------------|
| Admin | 3300 | http://localhost:3300 | `pnpm --filter admin dev --port 3300` |
| Website | 3301 | http://localhost:3301 | `pnpm --filter web dev --port 3301` |

**DO NOT use ports 3000, 3001** - those are Sarasite's.

---

## What This Project IS

✅ Multi-vendor marketplace
✅ Etsy alternative for Australian makers
✅ Seller storefronts ({user}.madebuy.com.au)
✅ IP protection (image hashing, timestamps)
✅ Etsy product sync/import
✅ Fair dispute resolution (48hr review)
✅ Subscription-based (no transaction fees)

## What This Project IS NOT

❌ Sara's personal jewelry site
❌ Single-vendor store
❌ Loutan Beauty
❌ Sarasite

---

## Business Model

### Pricing Tiers
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 10 products, store only |
| Maker | $19/mo | Unlimited, marketplace listing |
| Pro | $39/mo | Custom domain, analytics, priority |
| Business | $79/mo | Multi-store, API access |

### Key Differentiators
1. **IP Protection** - Image hashing + timestamps on upload
2. **Etsy Sync** - Import products, sync inventory
3. **Fair Disputes** - 48-hour review, not instant buyer wins
4. **Zero Transaction Fees** - Flat subscription only
5. **Multi-tenant** - {user}.madebuy.com.au storefronts

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python) |
| Frontend | React 18 + TypeScript |
| Database | MongoDB |
| Storage | Cloudflare R2 |
| Styling | Tailwind CSS |
| Deploy | Vultr VPS + Docker + Caddy |

## Structure (Monorepo)
```
madebuy/
├── apps/
│   ├── admin/          # Seller dashboard (port 3300)
│   ├── api/            # FastAPI backend
│   └── web/            # Public marketplace (port 3301)
├── packages/
│   ├── shared/         # Types, utilities
│   ├── ui/             # Shared components
│   └── database/       # MongoDB schemas
└── services/
    ├── social/         # Late API integration
    └── email/          # Resend
```

---

## Feature Boundaries

### ALLOWED Features (Marketplace)
- Seller registration/onboarding
- Product listings with search/filter
- Multi-vendor storefronts
- Marketplace browse/discovery
- Subscription management
- IP protection tools
- Etsy import/sync
- Dispute resolution
- Analytics for sellers

### FORBIDDEN (These belong to Sarasite)
- Sara-specific jewelry features
- Loutan Beauty branding
- Single-owner inventory management

If asked about "Sara", "jewelry", "Loutan" → **STOP and confirm project**

---

## Agents

When asked to "Act as [agent]", read from `.agents/domains/[agent]/`

| Agent | Purpose |
|-------|---------|
| task | General research (context preservation) |
| backend-researcher | API/DB patterns |
| frontend-researcher | UI/Component patterns |
| security-researcher | Auth, permissions |
| deployment-reviewer | Pre-deploy, Docker, Vultr |
| project-manager | Multi-domain coordination |

---

## Before Making Changes

1. Confirm this is marketplace-related work
2. If it sounds like Sara's jewelry → STOP, ask user
3. Check you're in ~/c/madebuy
4. Use correct ports (3300, 3301)
