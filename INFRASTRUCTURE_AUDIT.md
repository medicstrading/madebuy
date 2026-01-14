# MadeBuy Infrastructure Architecture Audit & Recommendations

**Date**: January 6, 2026
**Project**: MadeBuy Marketplace
**Current Deployment**: Railway with Docker/PM2
**Status**: Pre-production / Development

---

## Executive Summary

MadeBuy is a Next.js 14 marketplace application deployed on a single Railway using PM2 process management. While functional for development, the current architecture has **significant gaps** in security hardening, scalability, disaster recovery, and production readiness.

**Critical Issues Identified**:
1. No Docker Compose configuration found (despite documentation references)
2. Missing production environment variables and secrets management
3. No backup strategy or disaster recovery plan
4. Single point of failure (single VPS, single MongoDB instance)
5. No monitoring, alerting, or observability stack
6. Missing CI/CD pipeline for automated deployments
7. Incomplete security hardening (rate limiting partially implemented)
8. No SSL/TLS termination configuration documented
9. Production secrets exposed in codebase (Cloudflare API tokens in .env files)

**Estimated Risk Level**: **HIGH** - Not production-ready in current state

---

## 1. Current Architecture Analysis

### 1.1 Deployment Stack

**Current Setup**:
```
├── Railway (Sydney)
│   ├── Node.js 20
│   ├── PM2 Process Manager
│   │   ├── madebuy-admin (port 3301)
│   │   └── madebuy-web (port 3302)
│   └── (No reverse proxy documented)
│
├── MongoDB (Location: Unknown - likely Atlas)
├── Cloudflare R2 (Media Storage)
├── Stripe (Payment Processing)
├── Resend (Email)
└── Cloudflare (DNS/CDN assumed)
```

**Monorepo Structure** (Turborepo):
```
apps/
  ├── admin/     # Maker dashboard (Next.js, port 3301)
  └── web/       # Customer storefront (Next.js, port 3302)
packages/
  ├── db/        # MongoDB repositories
  ├── shared/    # Common types/utilities
  ├── social/    # Social media integrations
  ├── storage/   # R2 storage layer
  ├── cloudflare/# Cloudflare APIs
  ├── shipping/  # Shipping logic
  └── scanner/   # (Unknown purpose)
```

**Dockerfile Analysis**:
- Multi-stage build (builder + runner)
- Uses PM2 in production container
- Node.js 20 Alpine base
- No health checks defined
- Exposes ports 3301, 3302
- **Issue**: No docker-compose.yml found despite references in documentation

### 1.2 Application Architecture

**Technology Stack**:
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: MongoDB (468 TypeScript files suggest significant complexity)
- **Authentication**: NextAuth.js
- **Storage**: Cloudflare R2 (S3-compatible)
- **Payments**: Stripe Connect (multi-tenant)
- **Email**: Resend
- **Bot Protection**: Cloudflare Turnstile (configured)
- **AI**: OpenAI (caption generation)
- **Social**: Late API (Instagram, Facebook, Pinterest, TikTok)

**Build Configuration**:
- Bundle optimization enabled (`optimizePackageImports`)
- Security headers configured (CSP, HSTS, X-Frame-Options)
- Image optimization with WebP format
- Production vs Development CSP differentiation
- 4GB memory allocation for builds (`--max_old_space_size=4096`)

---

## 2. Security Analysis

### 2.1 Current Security Measures (GOOD)

✅ **Content Security Policy (CSP)**:
```javascript
// Both apps have comprehensive CSP headers
"default-src 'self'",
"script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com",
"img-src 'self' blob: https://*.r2.dev https://*.stripe.com",
"frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com"
```

✅ **Security Headers**:
- HSTS (production only) - Correct
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (disables camera, microphone, geolocation)

✅ **IP Protection Strategy**:
- Cloudflare Turnstile bot protection implemented
- Rate limiting planned (Upstash Redis)
- User-agent blocking documented
- Image watermarking strategy designed (not yet implemented)

✅ **Authentication**:
- NextAuth.js with proper session management
- `NEXTAUTH_SECRET` configured (but visible in codebase)

✅ **Payment Security**:
- Stripe webhook signatures
- Webhook secret environment variables

### 2.2 Security Vulnerabilities (CRITICAL)

❌ **EXPOSED SECRETS IN REPOSITORY**:
```bash
# Found in /home/aaron/claude-project/madebuy/apps/admin/.env.local
CLOUDFLARE_API_TOKEN=DIxitre8If5RdlONpYRk13THaWiVynJZxBlTN10_
CLOUDFLARE_MADEBUY_ZONE_ID=a225ac7c0bf4cf18ed495014a6fe1754
NEXTAUTH_SECRET=VQ4Lun85loZ4xKAZ2+eZiwJYWAWLBl9xXP7EuVeC+lE=
```
**Impact**: CRITICAL - These tokens provide full API access to Cloudflare account
**Action Required**:
1. IMMEDIATELY rotate these tokens
2. Add .env.local to .gitignore (may already be present)
3. Audit git history for any pushed secrets
4. Use secrets management (Doppler, AWS Secrets Manager, Vault)

❌ **No Rate Limiting Implemented**:
- Documentation shows rate limiting with Upstash Redis planned
- Not implemented in current codebase
- **Risk**: API abuse, scraping, DDoS attacks

❌ **Missing Environment Variables**:
```bash
# Critical missing in production:
- MONGODB_URI (not set in .env.local files)
- R2 credentials (not configured)
- Stripe keys (not configured)
- OpenAI API key (not configured)
```

❌ **No WAF (Web Application Firewall)**:
- Cloudflare Free plan likely in use (no WAF rules documented)
- Need Cloudflare Pro ($20/mo) for custom WAF rules

❌ **Build Configuration Issues**:
```javascript
// Admin app has unsafe configurations
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true }
```
**Risk**: Type errors and linting issues bypass validation

❌ **No Secrets Rotation Policy**:
- No documented secrets rotation schedule
- No automated secret rotation

### 2.3 Security Recommendations (PRIORITY ORDER)

**P0 - IMMEDIATE (Before Production)**:
1. **Rotate all exposed secrets** (Cloudflare token, NextAuth secret)
2. **Implement secrets management**:
   - Option A: Doppler (free tier, 5 projects)
   - Option B: AWS Secrets Manager ($0.40/secret/month)
   - Option C: HashiCorp Vault (self-hosted, free)
3. **Add .env.local to .gitignore** and verify it's not in git history
4. **Enable rate limiting** with Upstash Redis (free tier: 10K requests/day)
5. **Set all required environment variables** for production

**P1 - BEFORE LAUNCH (Week 1)**:
6. **Enable Cloudflare Pro** ($20/mo) for:
   - WAF custom rules
   - Rate limiting at edge
   - Advanced DDoS protection
7. **Implement IP-based rate limiting** (10 req/10s for anonymous users)
8. **Enable MongoDB Atlas encryption at rest** (verify current configuration)
9. **Configure Stripe webhook IP whitelisting**
10. **Add security monitoring** (AWS GuardDuty, Cloudflare Security Analytics)

**P2 - POST-LAUNCH (Month 1)**:
11. **Implement image watermarking** (Sharp library - already documented)
12. **Add CAPTCHA for high-risk actions** (order creation, account signup)
13. **Enable MongoDB Atlas network peering** or IP whitelist (restrict to VPS IP only)
14. **Set up security scanning** (Snyk, Dependabot for dependency vulnerabilities)
15. **Implement audit logging** for sensitive actions (product deletion, price changes)

---

## 3. Scalability Analysis

### 3.1 Current Limitations

**Single Point of Failure**:
```
Current: 1 VPS → Both apps → MongoDB Atlas

Issues:
- VPS failure = total outage
- No horizontal scaling capability
- PM2 cluster mode not configured (single instance per app)
- No load balancer
```

**PM2 Configuration Issues**:
```javascript
// ecosystem.config.js
{
  instances: 1,  // ❌ Not using cluster mode
  max_memory_restart: '1G',  // ⚠️ Low memory limit for Next.js
}
```

**Database Scalability**:
- MongoDB connection string not visible (likely Atlas)
- No connection pooling configuration documented
- Cross-tenant marketplace queries may be slow without proper indexing
- Excellent index strategy documented (11 indexes planned) but not verified as implemented

### 3.2 Performance Considerations

**Build Performance**:
- 4GB memory allocation suggests large build size
- 468 TypeScript files = significant compilation time
- Turborepo caching not configured (no turbo.json found)
- No build caching between deployments

**Image Optimization**:
✅ Next.js image optimization configured:
- WebP format
- Multiple device sizes (640px - 1920px)
- 1-year cache TTL
- R2 CDN for static assets

**API Performance**:
- No caching layer documented (Redis/Upstash planned but not implemented)
- Next.js ISR (Incremental Static Regeneration) not utilized
- No CDN caching strategy for API routes

### 3.3 Scalability Recommendations

**Phase 1: Optimize Current Setup (1-2 days)**
```javascript
// ecosystem.config.js - Enable cluster mode
{
  name: 'madebuy-web',
  instances: 'max',  // Use all CPU cores (4-8 on typical VPS)
  exec_mode: 'cluster',
  max_memory_restart: '2G',  // Increase memory limit
}
```

**Phase 2: Add Caching Layer (3-5 days)**
```typescript
// Use Upstash Redis for:
- Session storage (reduce MongoDB load)
- API response caching (product listings, marketplace browse)
- Rate limiting counters
- Real-time analytics

Cost: Free tier (10K req/day) → $0.20/100K requests after
```

**Phase 3: Database Optimization (1 week)**
1. Verify all 11 MongoDB indexes are created:
   ```bash
   db.products.getIndexes()
   ```
2. Enable MongoDB Atlas auto-scaling:
   - M10 cluster: $0.08/hr = ~$60/mo (recommended minimum for production)
   - Auto-scale to M20 under load
3. Implement read replicas for marketplace queries (cross-tenant reads)
4. Add connection pooling:
   ```typescript
   // MongoDB connection options
   maxPoolSize: 50,
   minPoolSize: 10,
   maxIdleTimeMS: 30000,
   ```

**Phase 4: Horizontal Scaling (2-4 weeks)**
```
Option A: Multi-VPS with Load Balancer
┌─────────────────┐
│ Cloudflare LB   │ ($5/mo for Load Balancing)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ VPS 1 │ │ VPS 2 │ (2x $20/mo = $40/mo)
└───────┘ └───────┘
    │         │
    └────┬────┘
         │
    ┌────▼────┐
    │ MongoDB │ (Atlas M10 = $60/mo)
    └─────────┘

Total: ~$105/mo for high availability
```

```
Option B: Move to Managed Platform (Recommended)
┌─────────────────────────────────────────┐
│ Vercel / Railway / Fly.io              │
│                                         │
│  Auto-scaling, CDN, SSL included       │
│  Zero-config deployments               │
│  Built-in monitoring                   │
└─────────────────────────────────────────┘
         │
    ┌────▼────┐
    │ MongoDB │ (Atlas M10 = $60/mo)
    └─────────┘

Cost: $20-60/mo (app hosting) + $60/mo (DB) = $80-120/mo
Benefits:
- Automatic horizontal scaling
- Global CDN
- Built-in SSL/TLS
- Zero-downtime deployments
- Integrated monitoring
- Better DX (push to deploy)
```

**Phase 5: Serverless Architecture (3-6 months)**
```
Future State:
┌──────────────────────────────────────────┐
│ Cloudflare Workers / Vercel Edge        │ (Global edge deployment)
│                                          │
│  - Next.js Edge runtime                  │
│  - Middleware at edge                    │
│  - Image optimization at edge            │
└───────────────┬──────────────────────────┘
                │
       ┌────────┼────────┐
       │        │        │
   ┌───▼───┐ ┌─▼──┐ ┌───▼────┐
   │MongoDB│ │R2  │ │ Stripe │
   │ Atlas │ │CDN │ │        │
   └───────┘ └────┘ └────────┘

Cost: $100-200/mo at 1M requests/month
Benefits: Global low latency, infinite scale
```

### 3.4 Immediate Scaling Actions (Pre-Launch)

1. **Enable PM2 cluster mode** (free, 10 minutes):
   ```bash
   # ecosystem.config.js
   instances: 'max',
   exec_mode: 'cluster'
   ```

2. **Add Redis caching** (Upstash free tier, 2-3 hours):
   ```typescript
   import { Redis } from '@upstash/redis'

   // Cache marketplace listings for 5 minutes
   const cached = await redis.get('marketplace:featured')
   if (cached) return cached

   const products = await db.products.find({...})
   await redis.set('marketplace:featured', products, { ex: 300 })
   ```

3. **Optimize MongoDB queries** (1 day):
   - Run explain() on all marketplace queries
   - Verify indexes are being used
   - Add missing indexes if needed

4. **Configure CDN caching** (Cloudflare, 1 hour):
   ```nginx
   # Cache static assets for 1 year
   Cache-Control: public, max-age=31536000, immutable

   # Cache API responses for 5 minutes
   Cache-Control: public, max-age=300, stale-while-revalidate=60
   ```

---

## 4. Cost Optimization

### 4.1 Current Cost Estimate

**Estimated Monthly Costs** (based on typical setup):
```
Infrastructure:
- Railway (8GB RAM, Sydney)       $40/mo
- MongoDB Atlas M10 (estimated)     $60/mo  ❓ (not confirmed)
- Cloudflare Free                    $0/mo
- Cloudflare R2 Storage             ~$5/mo  (10GB storage, 1M requests)
───────────────────────────────────────────
Subtotal Infrastructure:           $105/mo

Services:
- Stripe (2.9% + 30¢)               Variable (revenue-based)
- Resend (Free tier: 100/day)        $0/mo  ($20/mo for 50K/month)
- OpenAI API (GPT-4 captions)       ~$10/mo (estimated usage)
- Late API (social posting)         ~$20/mo ❓ (pricing unknown)
- Upstash Redis (not yet added)      $0/mo  (free tier)
───────────────────────────────────────────
Subtotal Services:                  ~$30/mo
───────────────────────────────────────────
TOTAL ESTIMATED:                   ~$135/mo
```

**Missing Cost Visibility**:
❌ MongoDB Atlas tier not confirmed
❌ R2 storage actual usage unknown
❌ Bandwidth costs not tracked
❌ Late API pricing not documented

### 4.2 Cost Optimization Opportunities

**Quick Wins (Immediate)**:

1. **MongoDB Atlas Right-Sizing** (Potential savings: $30-40/mo)
   ```
   Current (assumed): M10 ($60/mo)
   Optimized:
   - Start with M2 ($9/mo) for first 100 tenants
   - Scale to M5 ($25/mo) at 500 tenants
   - Move to M10 ($60/mo) at 2,000 tenants

   Savings: $35-51/mo initially
   ```

2. **Cloudflare R2 vs S3 Cost Comparison** (Already optimized ✅)
   ```
   R2: $0.015/GB storage, $0/GB egress
   S3: $0.023/GB storage, $0.09/GB egress

   For 100GB storage, 1TB/mo egress:
   - R2: $1.50/mo
   - S3: $92.30/mo

   Savings: $90/mo ✅ Good choice!
   ```

3. **Resend Email Optimization** (Potential savings: $20/mo)
   ```
   Current: Unknown usage
   Optimization:
   - Use transactional emails only (order confirmations, password resets)
   - Batch marketing emails through cheaper provider (SendGrid, Mailgun)
   - Implement email queue to avoid rate limits

   Free tier: 100 emails/day = 3,000/month
   If exceeding: Consider Mailgun ($35/mo for 50K, cheaper than Resend)
   ```

4. **OpenAI API Cost Reduction** (Potential savings: $5-8/mo)
   ```
   Current: GPT-4 for AI captions (estimated)
   Optimization:
   - Use GPT-3.5-turbo instead ($0.0005/1K tokens vs $0.03/1K tokens)
   - Cache generated captions for similar products
   - Only generate AI captions on request, not automatically

   Cost reduction: 60x cheaper ($10/mo → $0.17/mo for same usage)
   ```

**Medium-term Optimizations (1-3 months)**:

5. **VPS → Managed Platform Comparison**
   ```
   Current VPS Setup:
   - Railway 8GB:           $40/mo
   - Manual maintenance:      ~5 hrs/mo (valued at $50-100/hr)
   - No auto-scaling:         Wasted capacity during off-peak
   Total Cost:                $40/mo + opportunity cost

   Alternative: Railway / Fly.io / Render
   - Hobby plan:              $20-30/mo
   - Auto-scaling:            Pay only for actual usage
   - Zero maintenance:        Fully managed
   - Built-in monitoring:     No additional cost
   Total Cost:                $20-30/mo + peace of mind

   Savings: $10-20/mo + reduced maintenance burden
   ```

6. **Database Connection Pooling** (Reduce database tier need)
   ```typescript
   // Optimize MongoDB connection pooling
   maxPoolSize: 50,  // Instead of unlimited connections
   minPoolSize: 10,  // Keep warm connections ready

   Result: Can handle 10x more traffic on same DB tier
   Savings: Delay database scaling by 6-12 months
   ```

7. **Implement ISR (Incremental Static Regeneration)**
   ```typescript
   // Reduce database queries by 90%
   export const revalidate = 3600 // Revalidate every hour

   // Marketplace homepage, category pages, product pages
   // Currently: DB query on every request
   // With ISR: DB query once per hour, serve from CDN

   Result:
   - 90% reduction in MongoDB read units
   - 10x faster page loads
   - Lower database tier sufficient
   ```

**Long-term Cost Optimization (6+ months)**:

8. **Multi-region Architecture** (if going global)
   ```
   Instead of: Single VPS in Sydney

   Use: Cloudflare Workers + Regional databases
   - Workers: $5/mo for 10M requests
   - MongoDB Atlas Multi-region read replicas

   Benefits:
   - Users in US/EU get <100ms latency (vs 200-300ms from Sydney)
   - Cloudflare automatically routes to nearest POP
   - No need for multiple VPS instances
   ```

### 4.3 FinOps Best Practices to Implement

1. **Cost Monitoring Dashboard** (High Priority)
   ```typescript
   // Track monthly costs in admin dashboard
   - MongoDB Atlas: Use Billing API to fetch current usage
   - Cloudflare R2: Track storage and bandwidth
   - Stripe: Monitor transaction fees
   - OpenAI: Track API usage in real-time

   Alert when costs exceed budget thresholds
   ```

2. **Resource Tagging Strategy**
   ```
   Tag all resources with:
   - environment: production | staging | development
   - project: madebuy
   - cost-center: infrastructure | services | ai

   Enables cost allocation and per-environment tracking
   ```

3. **Cost Anomaly Detection**
   ```typescript
   // Alert on unusual spikes
   - Cloudflare R2 bandwidth >100GB in single day
   - OpenAI API costs >$50 in single day
   - MongoDB queries >1M in single hour

   Prevents surprise bills from attacks or bugs
   ```

4. **Reserved Instances / Committed Use Discounts**
   ```
   Once traffic is stable:
   - MongoDB Atlas: 1-year commitment = 20% discount
   - Railway: 12-month prepay = 15% discount
   - Cloudflare: Annual billing = 17% discount

   Potential savings: $20-30/mo after 6 months of stable usage
   ```

### 4.4 Projected Costs at Scale

**Scenario A: 1,000 Makers, 10,000 Products**
```
- MongoDB Atlas M10:              $60/mo
- VPS or Railway:                 $40/mo
- Cloudflare R2 (500GB):          $10/mo
- Resend (20K emails/mo):         $20/mo
- OpenAI (optimized):              $2/mo
- Upstash Redis (Pro):            $10/mo
────────────────────────────────────────
Total:                           $142/mo
```

**Scenario B: 10,000 Makers, 100,000 Products**
```
- MongoDB Atlas M30 (cluster):   $340/mo
- Railway Pro (auto-scale):      $100/mo
- Cloudflare R2 (5TB):            $75/mo
- Resend (200K emails/mo):       $100/mo
- OpenAI (optimized):             $20/mo
- Upstash Redis (Pro):            $50/mo
- Cloudflare Pro:                 $20/mo
────────────────────────────────────────
Total:                           $705/mo
```

**Revenue Breakeven Analysis**:
```
If charging $15/mo per maker (Maker tier):
- Scenario A (1,000 makers): $15,000/mo revenue - $142/mo costs = $14,858/mo profit (99% margin)
- Scenario B (10,000 makers): $150,000/mo revenue - $705/mo costs = $149,295/mo profit (99.5% margin)

Conclusion: Infrastructure costs are negligible compared to revenue potential
Focus should be on feature velocity and user growth, not over-optimizing $10/mo savings
```

---

## 5. Reliability & Disaster Recovery

### 5.1 Current State (POOR)

**Uptime Dependencies**:
```
Single Point of Failure:
├── Railway (Sydney)
│   ├── Hardware failure → Total outage
│   ├── Network issue → Total outage
│   └── PM2 crash → Manual restart required
│
├── MongoDB Atlas (Unknown config)
│   ├── No visible backup strategy
│   └── Unknown replication factor
│
└── Cloudflare (Good)
    └── Multiple layers of redundancy ✅
```

**Backup Status**:
❌ No database backup strategy documented
❌ No application state backups
❌ No disaster recovery plan
❌ No tested restore procedures
❌ No backup retention policy

**Monitoring**:
❌ No application monitoring (no APM)
❌ No error tracking (no Sentry/Rollbar)
❌ No uptime monitoring (no Pingdom/UptimeRobot)
❌ No log aggregation (PM2 logs only local)
❌ No alerting configured

**Deployment**:
❌ No CI/CD pipeline
❌ Manual deployments only
❌ No deployment rollback mechanism
❌ No blue-green or canary deployments

### 5.2 RTO/RPO Analysis

**Current Estimated Values**:
```
RTO (Recovery Time Objective):
- VPS failure: 1-4 hours (manual VPS rebuild + restore)
- Database failure: Unknown (depends on Atlas config)
- Application crash: 1-5 minutes (PM2 auto-restart)

RPO (Recovery Point Objective):
- Database: Unknown (depends on backup frequency)
- Application state: None (no backups)
- Media files: Low (R2 has high durability)

Target for E-commerce:
- RTO: <15 minutes (acceptable for marketplace, not critical infrastructure)
- RPO: <1 hour (acceptable data loss window)
```

### 5.3 High Availability Recommendations

**Phase 1: Monitoring & Alerting (Week 1 - CRITICAL)**

1. **Application Monitoring** (Choose one):
   ```
   Option A: Sentry (Error Tracking)
   - Free tier: 5K errors/month
   - React error boundaries
   - API error tracking
   - Performance monitoring
   Cost: Free → $26/mo (10K errors)

   Option B: New Relic (APM)
   - Free tier: 100GB/month
   - Full stack observability
   - Database query insights
   - Distributed tracing
   Cost: Free → $99/mo (Pro)

   Option C: Datadog (Enterprise)
   - 15 hosts free for 14 days
   - Not cost-effective for small team

   RECOMMENDATION: Start with Sentry (free tier)
   ```

2. **Uptime Monitoring** (Free options):
   ```
   Option A: UptimeRobot
   - Free tier: 50 monitors, 5-min checks
   - Email/SMS/webhook alerts
   - Status page included
   Cost: Free

   Option B: BetterStack (formerly Uptime Robot)
   - Free tier: 10 monitors, 3-min checks
   - Better UI/UX
   Cost: Free → $20/mo

   RECOMMENDATION: UptimeRobot (free tier)
   ```

3. **Log Aggregation**:
   ```
   Option A: Better Stack Logs (formerly Logtail)
   - Free tier: 1GB/month
   - Searchable logs
   - Retention: 3 days
   Cost: Free → $15/mo (5GB)

   Option B: Papertrail
   - Free tier: 50MB/month
   - 7-day retention
   Cost: Free → $7/mo (1GB)

   Option C: CloudWatch Logs (if moving to AWS)
   - Pay per GB ingested
   Cost: $0.50/GB ingested

   RECOMMENDATION: Better Stack Logs
   ```

**Phase 2: Database Backup Strategy (Week 2)**

1. **MongoDB Atlas Configuration**:
   ```
   Required settings:
   ✓ Enable automated backups (daily snapshots)
   ✓ Retention: 7 days (free on M10+)
   ✓ Point-in-time recovery: Enable (for M10+)
   ✓ Cross-region backup copies: Enable (for M10+)

   Cost: Included in M10+ tier ($60/mo)
   ```

2. **Application Data Exports**:
   ```bash
   # Weekly export script
   #!/bin/bash
   # Backup critical collections
   mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

   # Upload to R2 backup bucket
   aws s3 sync /backups/ s3://madebuy-backups --endpoint-url=<R2_ENDPOINT>

   # Rotate old backups (keep 4 weeks)
   find /backups -mtime +28 -delete

   # Schedule: Weekly on Sundays at 2 AM
   crontab: 0 2 * * 0 /scripts/backup.sh
   ```

3. **Test Restore Procedures**:
   ```
   Monthly drill:
   1. Restore backup to staging environment
   2. Verify data integrity
   3. Test application functionality
   4. Document restore time (target: <1 hour)
   ```

**Phase 3: High Availability Infrastructure (Month 2-3)**

1. **Multi-VPS Setup with Load Balancing**:
   ```
   ┌──────────────────────────┐
   │ Cloudflare Load Balancer │ ($5/mo)
   └─────────┬────────────────┘
             │
       ┌─────┴─────┐
       │           │
   ┌───▼────┐  ┌───▼────┐
   │ VPS 1  │  │ VPS 2  │ Active-Active
   │ Sydney │  │ Sydney │ ($40/mo each)
   └───┬────┘  └───┬────┘
       │           │
       └─────┬─────┘
             │
       ┌─────▼─────┐
       │  MongoDB  │ M10 3-node replica set
       │   Atlas   │ ($60/mo)
       └───────────┘

   Benefits:
   - Zero downtime deployments
   - Auto-failover (60s detection + 30s failover)
   - 2x capacity (can lose 1 VPS)

   Total Cost: $145/mo (vs $105/mo single VPS)
   Uptime improvement: 99.5% → 99.95%
   ```

2. **Alternative: Managed Platform** (Recommended):
   ```
   ┌────────────────────────────────┐
   │ Railway / Vercel / Fly.io     │
   │                                │
   │ Auto-scaling: 2-10 instances  │
   │ Health checks: Built-in       │
   │ Auto-restart: Immediate       │
   │ Zero-downtime deploy: Built-in │
   └───────────┬────────────────────┘
               │
         ┌─────▼─────┐
         │  MongoDB  │ M10 3-node replica set
         │   Atlas   │
         └───────────┘

   Benefits:
   - Same uptime as multi-VPS
   - Less operational complexity
   - Better monitoring included
   - Easier scaling

   Total Cost: $80-120/mo
   Uptime: 99.95%+ (managed platform SLA)
   ```

**Phase 4: Disaster Recovery Procedures (Ongoing)**

1. **Documented DR Runbook**:
   ```markdown
   # Disaster Recovery Runbook

   ## Scenario 1: VPS Failure
   1. Provision new VPS in Sydney region (15 minutes)
   2. Install Node.js, PM2, dependencies (10 minutes)
   3. Pull latest code from GitHub (2 minutes)
   4. Restore environment variables from secrets manager (5 minutes)
   5. Build and start applications (10 minutes)
   6. Update Cloudflare DNS to new VPS IP (5 minutes, 5-min propagation)
   7. Verify application functionality
   Total RTO: 45-60 minutes

   ## Scenario 2: Database Corruption
   1. Identify latest valid backup snapshot (5 minutes)
   2. Restore snapshot to new cluster (15-30 minutes)
   3. Update application MONGODB_URI (2 minutes)
   4. Restart applications (5 minutes)
   5. Verify data integrity and application functionality
   Total RTO: 30-45 minutes
   RPO: Up to 24 hours (daily backups)

   ## Scenario 3: Code Deployment Failure
   1. Identify last working Git commit (2 minutes)
   2. Rollback code: git reset --hard <commit> (1 minute)
   3. Rebuild and restart: pnpm build && pnpm pm2:restart (5 minutes)
   Total RTO: 8-10 minutes
   ```

2. **Regular DR Testing**:
   ```
   Monthly:
   - Test database restore from backup
   - Verify backup integrity

   Quarterly:
   - Full DR drill: Simulate VPS failure and restore
   - Document actual RTO/RPO achieved
   - Update runbook with lessons learned

   Annually:
   - Test cross-region failover (if implemented)
   - Validate all access credentials still work
   ```

### 5.4 Immediate Actions (Pre-Launch)

**Week 1 - Monitoring (Priority: CRITICAL)**:
```bash
# 1. Add Sentry error tracking (3 hours)
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# 2. Set up UptimeRobot (30 minutes)
- Monitor: https://madebuy.com.au (5-min interval)
- Monitor: https://dashboard.madebuy.com.au (5-min interval)
- Monitor: MongoDB Atlas connection test endpoint

# 3. Configure PM2 monitoring (1 hour)
pm2 install pm2-logrotate  # Rotate logs daily, keep 7 days
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
```

**Week 2 - Backups (Priority: HIGH)**:
```bash
# 1. Verify MongoDB Atlas backups enabled (15 minutes)
# Login to Atlas console → Cluster → Backup → Enable

# 2. Create backup script (2 hours)
# See Phase 2 script above

# 3. Test restore procedure (2 hours)
# Restore to staging environment and verify
```

**Week 3 - CI/CD (Priority: MEDIUM)**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - name: Deploy to VPS
        run: |
          ssh ${{ secrets.VPS_HOST }} "cd /app && git pull && pnpm build && pnpm pm2:restart"
```

---

## 6. Production Readiness Checklist

### 6.1 Pre-Launch Blockers (MUST FIX)

**Security**:
- [ ] Rotate exposed Cloudflare API token
- [ ] Rotate exposed NEXTAUTH_SECRET
- [ ] Implement secrets management (Doppler/Vault)
- [ ] Remove secrets from git history
- [ ] Configure all production environment variables
- [ ] Enable rate limiting (Upstash Redis)
- [ ] Configure MongoDB Atlas network restrictions (IP whitelist)
- [ ] Enable MongoDB encryption at rest
- [ ] Set up Stripe webhook IP whitelisting
- [ ] Configure CORS for R2 bucket (restrict to domain only)

**Monitoring**:
- [ ] Add error tracking (Sentry)
- [ ] Add uptime monitoring (UptimeRobot)
- [ ] Configure alert notifications (email, Slack, PagerDuty)
- [ ] Set up log aggregation (Better Stack)
- [ ] Test all monitoring alerts

**Backups**:
- [ ] Enable MongoDB Atlas automated backups
- [ ] Test database restore procedure
- [ ] Create application backup script
- [ ] Schedule weekly backups (cron job)
- [ ] Document restore procedures

**Infrastructure**:
- [ ] Configure reverse proxy (Nginx/Caddy) with SSL termination
- [ ] Enable PM2 cluster mode (multi-core utilization)
- [ ] Increase PM2 memory limits (2GB)
- [ ] Configure PM2 log rotation
- [ ] Set up PM2 startup script (auto-restart on reboot)

**Deployment**:
- [ ] Create staging environment
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Document deployment procedures
- [ ] Test rollback procedures
- [ ] Create deployment checklist

### 6.2 Post-Launch (Week 1)

**Optimization**:
- [ ] Enable Cloudflare Pro ($20/mo)
- [ ] Configure WAF rules
- [ ] Set up CDN caching rules
- [ ] Implement API response caching (Redis)
- [ ] Verify all MongoDB indexes created

**Compliance**:
- [ ] Add GDPR cookie consent
- [ ] Create privacy policy
- [ ] Create terms of service
- [ ] Add DMCA takedown procedures
- [ ] Document data retention policies

### 6.3 Month 1 Improvements

**Scalability**:
- [ ] Implement ISR (Incremental Static Regeneration)
- [ ] Add Redis caching layer
- [ ] Optimize database queries (explain plan analysis)
- [ ] Enable Next.js Image Optimization CDN
- [ ] Consider multi-VPS or managed platform migration

**Observability**:
- [ ] Add performance monitoring (APM)
- [ ] Create ops dashboard (Grafana/Datadog)
- [ ] Set up cost tracking dashboard
- [ ] Configure anomaly detection alerts
- [ ] Implement audit logging

---

## 7. Architecture Evolution Roadmap

### 7.1 Current State (Development)
```
┌─────────────┐
│ Single VPS  │  PM2 (2 apps)
└──────┬──────┘
       │
   ┌───▼───┐
   │MongoDB│
   │ Atlas │
   └───────┘

Uptime: 99.0%
RTO: 1-4 hours
Capacity: ~100 concurrent users
```

### 7.2 Phase 1: Production Hardening (Month 1-2)
```
┌─────────────────────┐
│ Cloudflare (CDN)    │
└──────────┬──────────┘
           │
     ┌─────▼─────┐
     │  VPS      │  PM2 Cluster Mode
     │ + Nginx   │  Error Tracking (Sentry)
     │ + Redis   │  Uptime Monitoring
     └─────┬─────┘  Log Aggregation
           │
     ┌─────▼─────┐
     │ MongoDB   │  Automated Backups
     │ Atlas M10 │  3-node Replica Set
     └───────────┘

Uptime: 99.5%
RTO: <1 hour
Capacity: ~500 concurrent users
Cost: ~$180/mo
```

### 7.3 Phase 2: High Availability (Month 3-6)
```
┌──────────────────────────────┐
│ Cloudflare (CDN + WAF + LB) │
└───────────┬──────────────────┘
            │
       ┌────┴─────┐
       │          │
  ┌────▼───┐  ┌──▼─────┐
  │ VPS 1  │  │ VPS 2  │  Active-Active
  │+ Redis │  │+ Redis │  Health Checks
  └────┬───┘  └───┬────┘  Auto-Failover
       │          │
       └────┬─────┘
            │
      ┌─────▼─────┐
      │ MongoDB   │  Multi-region Backups
      │ Atlas M10 │  Point-in-time Recovery
      └───────────┘

Uptime: 99.95%
RTO: <15 minutes
Capacity: ~2,000 concurrent users
Cost: ~$220/mo
```

### 7.4 Phase 3: Global Scale (Year 1+)
```
┌───────────────────────────────────────────────┐
│ Cloudflare Workers (Edge Runtime)            │
│   - Middleware at 275+ locations             │
│   - Image optimization at edge                │
│   - Rate limiting at edge                     │
└────────────────┬──────────────────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
    ┌───▼───┐ ┌─▼──┐ ┌───▼─────┐
    │MongoDB│ │R2  │ │  Stripe │
    │ Atlas │ │CDN │ │         │
    │ Sharded│ │    │ │         │
    └───────┘ └────┘ └─────────┘

Uptime: 99.99%
RTO: <5 minutes (automatic)
Capacity: 100,000+ concurrent users
Cost: ~$500-1000/mo (at scale)
```

---

## 8. Recommended Immediate Action Plan

### Week 1: Security & Secrets (CRITICAL)

**Day 1-2: Secrets Management**
```bash
# 1. Rotate compromised secrets (IMMEDIATE)
- Cloudflare API token: https://dash.cloudflare.com/profile/api-tokens
- Generate new NEXTAUTH_SECRET: openssl rand -base64 32

# 2. Set up Doppler (2 hours)
curl -Ls https://cli.doppler.com/install.sh | sh
doppler login
doppler setup --project madebuy --config production

# 3. Migrate env vars to Doppler (2 hours)
doppler secrets set MONGODB_URI STRIPE_SECRET_KEY R2_ACCESS_KEY_ID...

# 4. Update deployment to use Doppler (1 hour)
# ecosystem.config.js
env: {
  NODE_ENV: 'production',
  // All other vars loaded from: doppler run -- pm2 start ecosystem.config.js
}
```

**Day 3-4: Rate Limiting & Bot Protection**
```bash
# 1. Set up Upstash Redis (1 hour)
# https://console.upstash.com → Create database (free tier)

# 2. Implement rate limiting (3 hours)
# middleware.ts
import { Ratelimit } from '@upstash/ratelimit'

export async function middleware(request: Request) {
  const { success } = await ratelimit.limit(request.ip)
  if (!success) return new Response('Too Many Requests', { status: 429 })
  return NextResponse.next()
}

# 3. Configure Cloudflare Turnstile (already done ✅)
```

**Day 5: Database Security**
```bash
# 1. MongoDB Atlas Network Access (1 hour)
- Add VPS IP to IP Access List
- Remove 0.0.0.0/0 (allow all) if present

# 2. Enable encryption at rest (30 minutes)
- Atlas Console → Security → Encryption at Rest → Enable

# 3. Verify connection string uses TLS (5 minutes)
mongodb+srv://... (uses TLS by default)
```

### Week 2: Monitoring & Backups

**Day 1-2: Error Tracking & Monitoring**
```bash
# 1. Add Sentry (3 hours)
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Configure both apps:
# apps/admin/sentry.client.config.js
# apps/web/sentry.client.config.js

# 2. Set up UptimeRobot (30 minutes)
- Add 3 monitors (admin, web, health check)
- Configure Slack/email alerts

# 3. Add health check endpoints (1 hour)
# apps/*/app/api/health/route.ts
export async function GET() {
  const dbOk = await checkMongoConnection()
  return Response.json({ status: dbOk ? 'ok' : 'error' })
}
```

**Day 3-4: Backups**
```bash
# 1. Enable MongoDB Atlas backups (15 minutes)
- Atlas Console → Cluster → Backup → Enable
- Verify M10+ tier for point-in-time recovery

# 2. Create backup script (2 hours)
# scripts/backup.sh (see Phase 2 above)

# 3. Test restore (2 hours)
# Restore to staging MongoDB instance
mongorestore --uri="$STAGING_MONGODB_URI" --dir=/backups/latest

# 4. Schedule backups (1 hour)
crontab -e
0 2 * * 0 /app/scripts/backup.sh  # Weekly Sunday 2 AM
```

**Day 5: Log Management**
```bash
# 1. Configure PM2 log rotation (1 hour)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:max_size 100M

# 2. Set up Better Stack Logs (2 hours)
# https://betterstack.com/logs
# Add log shipping from PM2 to Better Stack
```

### Week 3: Infrastructure Optimization

**Day 1-2: Reverse Proxy & SSL**
```bash
# 1. Install Caddy (modern alternative to Nginx, auto-SSL)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# 2. Configure Caddyfile
# /etc/caddy/Caddyfile
dashboard.madebuy.com.au {
    reverse_proxy localhost:3301
}

*.madebuy.com.au {
    reverse_proxy localhost:3302
}

madebuy.com.au {
    reverse_proxy localhost:3302
}

# 3. Start Caddy (auto-provisions Let's Encrypt SSL)
sudo systemctl enable caddy
sudo systemctl start caddy
```

**Day 3-4: PM2 Optimization**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'madebuy-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3301',
      instances: 'max',        // ✅ Cluster mode
      exec_mode: 'cluster',    // ✅ Multi-core
      max_memory_restart: '2G', // ✅ Increased
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'madebuy-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3302',
      instances: 'max',        // ✅ Cluster mode
      exec_mode: 'cluster',    // ✅ Multi-core
      max_memory_restart: '2G', // ✅ Increased
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
```

**Day 5: Caching Layer**
```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Example: Cache marketplace listings
export async function getCachedMarketplaceProducts() {
  const cached = await redis.get('marketplace:featured')
  if (cached) return cached

  const products = await db.products.find({
    'marketplace.listed': true,
    'marketplace.approvalStatus': 'approved',
  }).limit(24).toArray()

  await redis.set('marketplace:featured', products, { ex: 300 }) // 5 min cache
  return products
}
```

### Week 4: CI/CD & Documentation

**Day 1-3: CI/CD Pipeline**
```yaml
# .github/workflows/production.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:run

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /app/madebuy
            git pull origin main
            doppler run -- pnpm install
            doppler run -- pnpm build
            doppler run -- pm2 reload ecosystem.config.js
            pm2 save
```

**Day 4-5: Documentation**
```markdown
# Create/update docs:
- DEPLOYMENT.md (production deployment guide)
- RUNBOOK.md (disaster recovery procedures)
- MONITORING.md (how to check system health)
- SECURITY.md (security policies and procedures)
- CONTRIBUTING.md (for future team members)
```

---

## 9. Cost Summary & ROI Analysis

### 9.1 Current vs Optimized Costs

**Current Estimated (Unoptimized)**:
```
Infrastructure:      ~$105/mo
Services:            ~$30/mo
Total:              ~$135/mo
```

**Optimized (Week 4)**:
```
Infrastructure:
- Railway 8GB:              $40/mo
- MongoDB Atlas M2:            $9/mo  (↓ $51/mo if currently M10)
- Cloudflare Pro:             $20/mo  (new)
- Upstash Redis Free:          $0/mo

Services:
- Stripe:                Variable
- Resend:                     $0/mo  (free tier sufficient initially)
- OpenAI (GPT-3.5):           $2/mo  (↓ $8/mo with optimization)
- Late API:                  $20/mo
- Sentry Free:                $0/mo
- UptimeRobot Free:           $0/mo
- Better Stack Logs Free:     $0/mo

Total:                       $91/mo  (↓ $44/mo savings)
```

**High Availability (Month 3)**:
```
- 2x VPS + Load Balancer:    $85/mo
- MongoDB Atlas M10:         $60/mo
- Cloudflare Pro:            $20/mo
- Services:                  $22/mo
Total:                      $187/mo  (+$52/mo for 99.95% uptime)
```

### 9.2 Investment Summary

**Setup Time Investment**:
```
Week 1 (Security):        20-24 hours
Week 2 (Monitoring):      16-20 hours
Week 3 (Infrastructure):  16-20 hours
Week 4 (CI/CD):           16-20 hours
────────────────────────────────────
Total:                    68-84 hours (2-3 weeks full-time)
```

**Ongoing Operational Time**:
```
Before Optimizations:
- Manual deployments:       2 hrs/week
- Incident response:        4 hrs/week (no monitoring)
- Backup verification:      None (risky!)
Total:                      6 hrs/week = ~24 hrs/month

After Optimizations:
- Automated deployments:    0.5 hrs/week
- Incident response:        1 hr/week (proactive monitoring)
- Backup verification:      1 hr/week
- System maintenance:       1 hr/week
Total:                      3.5 hrs/week = ~14 hrs/month

Time savings:              10 hrs/month = $500-1000/mo in opportunity cost
```

**ROI Calculation**:
```
Initial Investment:
- Setup time: 80 hours × $50/hr = $4,000 (one-time)

Monthly Savings:
- Infrastructure optimization:   $44/mo
- Operational time savings:     $750/mo (10 hrs × $75/hr)
- Prevented downtime:           $1,000/mo (estimated)
Total monthly benefit:          $1,794/mo

Payback Period: 4000 / 1794 = 2.2 months

Year 1 ROI: (1794 × 12 - 4000) / 4000 = 439% ROI
```

---

## 10. Final Recommendations

### 10.1 Critical Path (Pre-Launch Essentials)

**Must Complete Before Public Launch** (2-3 weeks):

1. **Security Hardening** (Week 1):
   - Rotate exposed secrets (Cloudflare, NextAuth)
   - Implement secrets management (Doppler)
   - Enable rate limiting (Upstash Redis)
   - Restrict MongoDB network access (IP whitelist)
   - Configure SSL/TLS termination (Caddy)

2. **Monitoring & Alerting** (Week 2):
   - Add error tracking (Sentry)
   - Add uptime monitoring (UptimeRobot)
   - Configure log aggregation (Better Stack)
   - Create health check endpoints
   - Set up alert notifications (Slack/email)

3. **Backup & DR** (Week 2):
   - Enable MongoDB Atlas automated backups
   - Test database restore procedure
   - Document disaster recovery runbook
   - Schedule weekly application backups

4. **Infrastructure Optimization** (Week 3):
   - Configure reverse proxy with SSL (Caddy)
   - Enable PM2 cluster mode (multi-core)
   - Implement Redis caching layer (Upstash)
   - Verify all MongoDB indexes created
   - Increase PM2 memory limits

5. **CI/CD & Documentation** (Week 3-4):
   - Create GitHub Actions pipeline
   - Set up staging environment
   - Document deployment procedures
   - Create operational runbook
   - Test rollback procedures

### 10.2 Post-Launch Priorities (Month 1-3)

**Month 1**:
- Upgrade to Cloudflare Pro ($20/mo) for WAF
- Monitor costs and optimize (MongoDB tier, API usage)
- Implement ISR (Incremental Static Regeneration)
- Add performance monitoring (New Relic or Datadog)
- Create cost tracking dashboard

**Month 2-3**:
- Evaluate high availability setup (multi-VPS or managed platform)
- Implement advanced caching strategies
- Optimize database queries (explain plan analysis)
- Set up quarterly DR testing schedule
- Consider managed platform migration (Railway/Vercel/Fly.io)

### 10.3 Technology Recommendations

**Immediate (Free/Low Cost)**:
✅ **Doppler** for secrets management (free tier)
✅ **Upstash Redis** for caching/rate limiting (free tier)
✅ **Sentry** for error tracking (free tier)
✅ **UptimeRobot** for uptime monitoring (free tier)
✅ **Better Stack Logs** for log aggregation (free tier)
✅ **Caddy** for reverse proxy with auto-SSL (open source)

**Short-term (Month 1-3)**:
✅ **Cloudflare Pro** ($20/mo) - Essential for production
✅ **MongoDB Atlas M10** ($60/mo) - Required for backups & HA
❓ **New Relic** or **Datadog** ($50-100/mo) - APM for performance insights

**Long-term (Month 6+)**:
❓ **Managed Platform Migration** (Railway $20-50/mo, Vercel $20-100/mo)
   - Pros: Less ops burden, better scaling, included monitoring
   - Cons: Less control, potential vendor lock-in
   - **Recommendation**: Re-evaluate at 1,000 makers or 10K products

❓ **Multi-region Deployment** (6-12 months)
   - Only if expanding globally beyond Australia
   - Cloudflare Workers + Regional databases
   - Cost: $100-200/mo additional

### 10.4 Decision Matrix: VPS vs Managed Platform

**Stay on VPS if**:
- Tight budget (<$150/mo total infrastructure)
- Team has strong DevOps experience
- Need full control over infrastructure
- Australian-only deployment (no global latency concerns)
- <1,000 makers in first 6 months

**Migrate to Managed Platform (Railway/Vercel/Fly.io) if**:
- Budget allows $200-300/mo for infrastructure
- Small team without dedicated DevOps
- Need faster iteration velocity
- Planning global expansion
- >1,000 makers or rapid growth expected

**Current Recommendation**:
**Stay on optimized VPS for 6 months**, then re-evaluate based on:
- Actual traffic patterns
- Team size and DevOps capacity
- Revenue (if $50K+/mo ARR, managed platform cost is negligible)
- Incident frequency (if >2 incidents/month, managed platform worth it)

---

## 11. Success Metrics

### 11.1 Week 4 Success Criteria

After completing the 4-week optimization plan, verify:

**Security**:
- [ ] Zero secrets exposed in codebase (verified with git-secrets scan)
- [ ] All production env vars managed via Doppler
- [ ] Rate limiting active (test with 100 requests in 10s → 429 response)
- [ ] MongoDB network restricted (test connection from unauthorized IP → fails)
- [ ] SSL/TLS active on all endpoints (A+ rating on SSL Labs)

**Monitoring**:
- [ ] Sentry capturing errors (test with intentional error)
- [ ] UptimeRobot monitoring 3 endpoints (5-min intervals)
- [ ] Alerts configured (test by stopping PM2 → receive alert within 10 min)
- [ ] Logs aggregated in Better Stack (verify last 24 hours visible)
- [ ] Health check endpoints responding (200 OK status)

**Backups**:
- [ ] MongoDB Atlas daily backups enabled (verify in console)
- [ ] Database restore tested successfully (documented time: <1 hour)
- [ ] Weekly application backups scheduled (verify cron job)
- [ ] Backup files stored in R2 (verify latest backup exists)

**Performance**:
- [ ] PM2 cluster mode active (verify multiple worker processes)
- [ ] Redis caching working (test cache hit rate >50%)
- [ ] Page load times <2s (test with WebPageTest)
- [ ] API response times <200ms (test with Artillery/k6)

**Deployment**:
- [ ] CI/CD pipeline active (test with dummy commit → auto-deploy)
- [ ] Staging environment functional (test with test deployment)
- [ ] Rollback procedure tested (rollback and verify works)
- [ ] Zero-downtime deployment verified (no 502/503 during deploy)

### 11.2 Month 3 Target Metrics

**Uptime & Reliability**:
- Target: 99.9% uptime (43 minutes downtime/month allowable)
- RTO: <15 minutes for any incident
- RPO: <1 hour data loss window
- MTTR (Mean Time To Repair): <30 minutes

**Performance**:
- Homepage load time: <1.5s (p95)
- API response time: <150ms (p95)
- Database query time: <50ms (p95)
- Error rate: <0.1% of requests

**Cost Efficiency**:
- Infrastructure cost per maker: <$0.20/month at 500 makers
- Database costs: <40% of total infrastructure spend
- Bandwidth costs: <20% of total infrastructure spend

### 11.3 Monitoring Dashboard KPIs

Create admin dashboard showing:
```typescript
// Key metrics to track
{
  uptime: {
    current_month: '99.95%',
    last_30_days: [99.1, 99.8, 99.9, ...],
  },
  performance: {
    avg_response_time: '127ms',
    p95_response_time: '245ms',
    error_rate: '0.08%',
  },
  costs: {
    current_month: '$142',
    breakdown: {
      database: '$60 (42%)',
      compute: '$40 (28%)',
      services: '$42 (30%)',
    },
  },
  traffic: {
    requests_today: '45,231',
    unique_visitors: '1,243',
    makers_active: '89',
    marketplace_sales: '$3,421',
  },
}
```

---

## 12. Conclusion

### 12.1 Current State Assessment

**Strengths**:
✅ Modern tech stack (Next.js 14, MongoDB, Turborepo)
✅ Good security headers configuration (CSP, HSTS)
✅ Comprehensive MongoDB indexing strategy designed
✅ IP protection features documented and partially implemented
✅ Cost-effective storage (Cloudflare R2 vs S3)
✅ Multi-tenant architecture with Stripe Connect

**Weaknesses**:
❌ **Critical**: Exposed secrets in codebase (immediate security risk)
❌ **Critical**: No production monitoring or error tracking
❌ **Critical**: No documented backup/restore procedures
❌ High: Single point of failure (single VPS, no redundancy)
❌ High: No CI/CD pipeline (manual deployments)
❌ Medium: Rate limiting not implemented (scraping/abuse risk)
❌ Medium: Build configuration ignores TypeScript/ESLint errors

**Risk Assessment**: **NOT PRODUCTION READY** in current state

### 12.2 Recommended Path Forward

**Option 1: Minimal Launch (2 weeks, $91/mo)**
```
Focus: Security + Monitoring essentials
- Fix exposed secrets (Day 1)
- Add error tracking (Sentry)
- Enable rate limiting (Upstash)
- Configure MongoDB backups
- Set up uptime monitoring

Best for: MVP launch, small initial user base (<100 makers)
Risk: Medium (acceptable for soft launch)
```

**Option 2: Production Hardened (4 weeks, $180/mo)** ⭐ RECOMMENDED
```
Focus: Complete 4-week optimization plan
- All security hardening
- Full monitoring stack
- CI/CD pipeline
- Redis caching layer
- PM2 cluster mode
- Reverse proxy with SSL
- Documented DR procedures

Best for: Public launch with marketing push
Risk: Low (production-grade)
```

**Option 3: High Availability (6-8 weeks, $220/mo)**
```
Focus: Zero-downtime architecture
- Everything from Option 2
- Multi-VPS setup with load balancer
- Advanced monitoring (APM)
- Quarterly DR testing
- Performance optimization

Best for: Business-critical application, high expected traffic
Risk: Minimal (enterprise-grade)
```

### 12.3 Final Verdict

**Recommendation**: Proceed with **Option 2 (4-week Production Hardening)** before public launch.

**Rationale**:
1. Current state has critical security vulnerabilities (exposed secrets)
2. Lack of monitoring = flying blind (no visibility into issues)
3. No backups = unacceptable data loss risk for paying customers
4. Infrastructure costs are negligible vs revenue potential (99%+ margin)
5. 4-week investment protects months of development work

**Timeline**:
- Week 1-4: Complete optimization plan
- Week 5: Staging environment testing + load testing
- Week 6: Soft launch to beta users (100 makers)
- Week 7-8: Monitor, fix issues, optimize
- Week 9: Public launch + marketing

**Budget**: $180/mo operational + $4,000 one-time setup = $6,160 first year

**Expected Outcome**:
- 99.9%+ uptime
- <15 minute incident response
- Full observability and alerting
- Automated deployments
- Tested disaster recovery
- Ready for 1,000+ makers

---

## Appendix A: Useful Commands

### MongoDB Operations
```bash
# Check indexes
db.products.getIndexes()

# Explain query plan
db.products.find({'marketplace.listed': true}).explain('executionStats')

# Database stats
db.stats()

# Collection stats
db.products.stats()

# Current operations
db.currentOp()
```

### PM2 Operations
```bash
# View detailed process info
pm2 info madebuy-web

# Monitor with logs
pm2 monit

# Flush logs
pm2 flush

# List all processes
pm2 list

# Restart with zero downtime
pm2 reload madebuy-web

# View environment variables
pm2 env 0
```

### Doppler Operations
```bash
# View secrets
doppler secrets

# Set secret
doppler secrets set KEY=value

# Run command with secrets
doppler run -- pm2 start ecosystem.config.js

# Download secrets to .env (for local dev)
doppler secrets download --no-file --format env > .env.local
```

### Caddy Operations
```bash
# Test Caddyfile
caddy validate --config /etc/caddy/Caddyfile

# Reload config (zero downtime)
sudo systemctl reload caddy

# View logs
sudo journalctl -u caddy -f

# Check SSL certificate status
caddy list-certificates
```

### System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
htop

# Check network connections
ss -tulpn

# Check open files
lsof | wc -l

# Monitor bandwidth
iftop
```

---

## Appendix B: Environment Variables Checklist

### Admin App (apps/admin/.env.local)

**Required (Critical)**:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/madebuy
MONGODB_DB=madebuy
NEXTAUTH_URL=https://dashboard.madebuy.com.au
NEXTAUTH_SECRET=<openssl rand -base64 32>
R2_ACCOUNT_ID=<cloudflare_account_id>
R2_ACCESS_KEY_ID=<r2_access_key>
R2_SECRET_ACCESS_KEY=<r2_secret_key>
R2_BUCKET_NAME=madebuy-media
R2_PUBLIC_URL=https://media.madebuy.com.au
```

**Optional (Features)**:
```bash
OPENAI_API_KEY=sk-proj-...
INSTAGRAM_CLIENT_ID=<instagram_client_id>
INSTAGRAM_CLIENT_SECRET=<instagram_client_secret>
LATE_API_KEY=<late_api_key>
CRON_SECRET=<openssl rand -hex 32>
CLOUDFLARE_API_TOKEN=<token_with_zone_edit>
CLOUDFLARE_MADEBUY_ZONE_ID=<zone_id>
```

### Web App (apps/web/.env.local)

**Required (Critical)**:
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/madebuy
MONGODB_DB=madebuy
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
R2_PUBLIC_URL=https://media.madebuy.com.au

# For subscription billing
STRIPE_PRICE_MAKER_MONTHLY=price_...
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
```

**Optional (Features)**:
```bash
RESEND_API_KEY=re_...
DEFAULT_FROM_EMAIL=orders@madebuy.com.au
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<turnstile_site_key>
TURNSTILE_SECRET_KEY=<turnstile_secret_key>
```

### Monitoring & Operations

**Sentry**:
```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=<org_slug>
SENTRY_PROJECT=<project_slug>
SENTRY_AUTH_TOKEN=<auth_token>
```

**Upstash Redis**:
```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

**Better Stack**:
```bash
LOGTAIL_SOURCE_TOKEN=<source_token>
```

---

**Document Version**: 1.0
**Last Updated**: January 6, 2026
**Next Review**: After Week 4 implementation completion
