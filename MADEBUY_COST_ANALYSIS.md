# MadeBuy Platform Cost Analysis & Tiering System

**Date:** January 2025
**Prepared for:** Aaron
**Platform:** MadeBuy - Australian Handmade Marketplace

---

## Executive Summary

MadeBuy's infrastructure is designed for cost efficiency with a pay-as-you-grow model. Monthly fixed costs start at **$6-10 AUD** for a minimal viable production setup, scaling with usage. The platform's "zero transaction fee" promise to sellers is sustainable because costs are absorbed into subscription tiers rather than per-transaction fees.

| Cost Category | Minimum | Moderate (100 users) | Scale (1000 users) |
|---------------|---------|---------------------|-------------------|
| **Infrastructure** | $6/mo | $28/mo | $57+/mo |
| **APIs & Integrations** | $0/mo | $33/mo | $90+/mo |
| **Storage (R2)** | $0/mo | $1.50/mo | $15/mo |
| **Total Platform Cost** | **$6/mo** | **$62.50/mo** | **$162+/mo** |

---

## 1. Infrastructure Costs

### 1.1 Hosting (Railway)

Current setup on NUC for development. Production deployment options:

| Plan | Specs | Monthly Cost | Use Case |
|------|-------|--------------|----------|
| **Cloud Compute (Entry)** | 1 vCPU, 1GB RAM, 25GB NVMe, 1TB BW | **$6 AUD** | MVP/Early stage |
| **Cloud Compute (Standard)** | 2 vCPU, 4GB RAM, 80GB NVMe, 3TB BW | **$24 AUD** | 100-500 active users |
| **Optimized Cloud** | 2 vCPU dedicated, 4GB RAM, 50GB NVMe | **$28 AUD** | Production workloads |
| **High Performance** | 2 vCPU, 4GB RAM, 60GB NVMe | **$48 AUD** | High-traffic periods |

**Recommendation:** Start with $6/mo Cloud Compute, upgrade to $28/mo Optimized when traffic warrants.

**Additional Railway Costs:**
- Automatic backups: +20% of VPS cost (~$1.20-$5.60/mo)
- Snapshots: Free
- Bandwidth overage: $0.01/GB (unlikely to hit with 1-3TB included)

### 1.2 Database (MongoDB)

| Option | Storage | Monthly Cost | Notes |
|--------|---------|--------------|-------|
| **Self-hosted (Railway)** | Unlimited | $0 (included in VPS) | Manual backups, no HA |
| **Atlas Free (M0)** | 512MB | **$0** | Shared, good for dev |
| **Atlas Flex** | 5GB | **~$10-20** | Dev/test |
| **Atlas Dedicated (M10)** | 10GB | **$57 AUD** | Production, HA, backups |

**Recommendation:** Self-host on Railway initially ($0 extra). Move to Atlas M10 ($57/mo) when you need managed backups and high availability.

### 1.3 CDN & DNS (Cloudflare)

| Feature | Free Plan | Pro Plan ($25/mo) |
|---------|-----------|-------------------|
| Global CDN | Yes | Yes |
| SSL/TLS | Universal (shared) | Dedicated |
| DDoS Protection | Basic | Advanced |
| DNS | Enterprise-grade | Enterprise-grade |
| WAF Rules | 5 | 20 |
| Page Rules | 3 | 20 |

**Recommendation:** Free plan is sufficient. **Cost: $0/mo**

### 1.4 Infrastructure Summary

| Stage | VPS | Database | CDN | Total |
|-------|-----|----------|-----|-------|
| **MVP** | $6 | $0 (self-host) | $0 | **$6/mo** |
| **Growth** | $28 | $0 (self-host) | $0 | **$28/mo** |
| **Scale** | $48 | $57 (Atlas) | $0 | **$105/mo** |

---

## 2. API & Integration Costs

### 2.1 Late.dev (Social Media Publishing)

This is the primary variable cost as it scales per connected seller account.

| Plan | Profiles | Monthly Cost | Per-Profile |
|------|----------|--------------|-------------|
| **Free** | Testing only | $0 | N/A |
| **Build** | Up to 10 | **$13 AUD** | $1.30/profile |
| **Accelerate** | Up to 50 | **$33 AUD** | $0.66/profile |
| **Unlimited** | Unlimited | **$99+ AUD** | Volume pricing |

**Cost Model:**
- Each seller who enables social publishing = 1 profile
- Pro/Business/Enterprise tiers include social publishing
- If 30 sellers use social features: $33/mo (Accelerate plan)
- If 100+ sellers: Contact Late for volume pricing

**Recommendation:** Start with Build ($13/mo), upgrade to Accelerate ($33/mo) at 10+ active social publishers.

### 2.2 Resend (Transactional Email)

| Plan | Emails/Month | Monthly Cost | Per 1000 emails |
|------|--------------|--------------|-----------------|
| **Free** | 3,000 | $0 | $0 |
| **Pro** | 50,000 | **$20 AUD** | $0.40 |
| **Scale** | 100,000 | **$90 AUD** | $0.90 |

**Typical Email Volume:**
- Order confirmations: 1 per order
- Download links: 1 per digital purchase
- Welcome emails: 1 per signup

**Estimate:** 100 sellers with 50 orders/month each = 5,000 emails/month = Free tier sufficient

**Recommendation:** Free tier until exceeding 3,000 emails/month. **Cost: $0-20/mo**

### 2.3 Claude API (AI Captions - OpenAI in current code)

Currently using OpenAI, but Claude pricing for reference:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| **Haiku 4.5** | $1.00 | $5.00 |
| **Sonnet 4** | $3.00 | $15.00 |

**AI Caption Usage:**
- Average caption request: ~500 tokens in, ~200 tokens out
- Per caption cost (Haiku): ~$0.0015 AUD
- 100 captions/month: ~$0.15 AUD

**This is negligible.** Even 10,000 captions/month = $15 AUD

**Current Implementation:** Uses OpenAI (similar pricing). Rate limited to 10 req/min per tenant.

**Recommendation:** Keep OpenAI or switch to Claude Haiku. **Cost: $1-15/mo**

### 2.4 Stripe (Payment Processing)

**Platform fees (NOT passed to sellers - your cost for subscriptions):**

| Transaction Type | Fee |
|------------------|-----|
| Domestic cards (AU) | 1.70% + $0.30 |
| International cards | 1.70% + 3.5% + $0.30 |
| Currency conversion | +2% |

**Seller Transaction Processing (future marketplace model):**
If MadeBuy processes payments on behalf of sellers:
- Stripe Connect: Additional fees apply
- Current model: Sellers connect their own Stripe = $0 cost to MadeBuy

**Subscription Revenue Example:**
- 100 Pro subscribers @ $19/mo = $1,900 revenue
- Stripe fee: ~$35/mo (1.7% + $0.30 × 100)
- Net: $1,865/mo

### 2.5 API Cost Summary

| Service | Free Tier Limit | Paid Tier | Likely Cost |
|---------|-----------------|-----------|-------------|
| Late.dev | Testing only | $13-99/mo | **$13-33/mo** |
| Resend | 3,000 emails | $20-90/mo | **$0-20/mo** |
| Claude/OpenAI | Pay-per-use | ~$0.001/caption | **$1-5/mo** |
| Stripe | N/A | 1.7% + $0.30 | **~2% of revenue** |

---

## 3. Storage Costs (Cloudflare R2)

### 3.1 R2 Pricing

| Component | Cost | Notes |
|-----------|------|-------|
| **Storage** | $0.015/GB/month | First 10GB free |
| **Class A ops** (writes) | $4.50/million | PUT, POST, LIST |
| **Class B ops** (reads) | $0.36/million | GET, HEAD |
| **Egress** | **$0** | Zero egress fees! |

### 3.2 Storage Projections

**Per Seller Storage:**
- Average product images: 5 products × 4 images × 2MB = 40MB
- Product variants (thumbnails, etc.): +20MB
- Total per seller: ~60MB

| Sellers | Storage | Monthly Cost |
|---------|---------|--------------|
| 10 | 600MB | **$0** (free tier) |
| 100 | 6GB | **$0** (free tier) |
| 200 | 12GB | **$0.03** |
| 500 | 30GB | **$0.30** |
| 1,000 | 60GB | **$0.75** |
| 5,000 | 300GB | **$4.35** |

**Operations Cost (estimated):**
- 1,000 sellers × 50 product views/day × 4 images = 200,000 reads/day
- Monthly reads: 6M = $2.16/mo
- Monthly writes (uploads): ~50,000 = $0.23/mo

### 3.3 R2 Cost Summary

| Scale | Storage | Operations | Total |
|-------|---------|------------|-------|
| **MVP (100 sellers)** | $0 | $0.50 | **$0.50/mo** |
| **Growth (500 sellers)** | $0.30 | $1.50 | **$1.80/mo** |
| **Scale (2000 sellers)** | $1.35 | $5.00 | **$6.35/mo** |

**R2's $0 egress is massive savings** vs AWS S3 (~$0.09/GB egress).

---

## 4. Total Cost Projections

### 4.1 Monthly Operating Costs by Stage

#### MVP Stage (0-100 Sellers)

| Category | Service | Cost |
|----------|---------|------|
| Hosting | Railway Cloud Compute | $6 |
| Database | Self-hosted MongoDB | $0 |
| CDN/DNS | Cloudflare Free | $0 |
| Storage | R2 (free tier) | $0 |
| Email | Resend Free | $0 |
| Social | Late.dev Build | $13 |
| AI | Claude/OpenAI | $2 |
| **Total** | | **$21/mo** |

#### Growth Stage (100-500 Sellers)

| Category | Service | Cost |
|----------|---------|------|
| Hosting | Railway Optimized | $28 |
| Database | Self-hosted | $0 |
| CDN/DNS | Cloudflare Free | $0 |
| Storage | R2 | $2 |
| Email | Resend Free/Pro | $0-20 |
| Social | Late.dev Accelerate | $33 |
| AI | Claude/OpenAI | $5 |
| **Total** | | **$68-88/mo** |

#### Scale Stage (500-2000 Sellers)

| Category | Service | Cost |
|----------|---------|------|
| Hosting | Railway High Perf | $48 |
| Database | MongoDB Atlas M10 | $57 |
| CDN/DNS | Cloudflare Free | $0 |
| Storage | R2 | $6 |
| Email | Resend Pro | $20 |
| Social | Late.dev Unlimited | $99 |
| AI | Claude/OpenAI | $15 |
| **Total** | | **$245/mo** |

### 4.2 Break-Even Analysis

| Monthly Cost | Pro Subs Needed (@$19) | Business Subs Needed (@$39) |
|--------------|------------------------|----------------------------|
| $21 (MVP) | 2 | 1 |
| $88 (Growth) | 5 | 3 |
| $245 (Scale) | 13 | 7 |

**Conclusion:** Platform is profitable with minimal subscriber base.

---

## 5. Revised Tiering System

Based on cost analysis and the "reduced platform concept" (simpler, focused offering):

### 5.1 Proposed Tier Structure

#### Free Tier - "Starter"
**Price:** $0/month

| Feature | Limit |
|---------|-------|
| Products | 5 |
| Images per product | 3 |
| Storage | 50MB |
| Orders/month | 10 |
| Custom domain | No |
| Social publishing | No |
| AI captions | No |

**Purpose:** Try before you buy, hobby sellers

**Your Cost:** ~$0.10/user/month (minimal storage/bandwidth)

---

#### Pro Tier - "Maker"
**Price:** $15/month or $150/year (save $30)

| Feature | Limit |
|---------|-------|
| Products | 50 |
| Images per product | 8 |
| Storage | 500MB |
| Orders/month | Unlimited |
| Custom domain | Yes |
| Social publishing | Yes (1 platform) |
| AI captions | 20/month |
| Analytics | Basic |

**Purpose:** Serious hobbyists, side hustlers

**Your Cost:** ~$1.50/user/month
- Late.dev: ~$0.66/profile (at Accelerate scale)
- Storage: ~$0.01
- AI: ~$0.03
- Email: ~$0.02

**Margin:** $13.50/user (90%)

---

#### Business Tier - "Professional"
**Price:** $29/month or $290/year (save $58)

| Feature | Limit |
|---------|-------|
| Products | 200 |
| Images per product | 15 |
| Storage | 2GB |
| Orders/month | Unlimited |
| Custom domain | Yes |
| Social publishing | Yes (3 platforms) |
| AI captions | 100/month |
| Analytics | Advanced |
| Priority support | Yes |

**Purpose:** Full-time makers, small businesses

**Your Cost:** ~$2.50/user/month

**Margin:** $26.50/user (91%)

---

#### Enterprise Tier - "Studio"
**Price:** $59/month or $590/year (save $118)

| Feature | Limit |
|---------|-------|
| Products | Unlimited |
| Images per product | 30 |
| Storage | 10GB |
| Orders/month | Unlimited |
| Custom domain | Yes (multiple) |
| Social publishing | Unlimited platforms |
| AI captions | Unlimited |
| Analytics | Advanced + exports |
| Priority support | Yes |
| API access | Yes |
| Team members | Up to 3 |

**Purpose:** Established brands, multi-channel sellers

**Your Cost:** ~$5/user/month

**Margin:** $54/user (92%)

---

### 5.2 Tier Comparison Matrix

| Feature | Free | Pro ($15) | Business ($29) | Enterprise ($59) |
|---------|------|-----------|----------------|------------------|
| Products | 5 | 50 | 200 | Unlimited |
| Images/product | 3 | 8 | 15 | 30 |
| Storage | 50MB | 500MB | 2GB | 10GB |
| Custom domain | - | Yes | Yes | Yes |
| Social platforms | - | 1 | 3 | Unlimited |
| AI captions/mo | - | 20 | 100 | Unlimited |
| Analytics | - | Basic | Advanced | Advanced+ |
| Priority support | - | - | Yes | Yes |
| API access | - | - | - | Yes |
| Team members | 1 | 1 | 1 | 3 |

### 5.3 Pricing Rationale

**Why lower than current pricing ($19/$39/$79)?**

1. **Market positioning:** Undercut competitors while offering "zero fees"
2. **Volume strategy:** Lower barrier = more conversions
3. **Cost structure:** Late.dev's flat pricing at scale makes this sustainable
4. **Australian market:** $15 is a psychological sweet spot for hobbyists

**Revenue Projections:**

| Scenario | Free | Pro | Business | Enterprise | MRR |
|----------|------|-----|----------|------------|-----|
| **MVP** | 50 | 10 | 3 | 1 | $296 |
| **Growth** | 200 | 50 | 20 | 5 | $1,625 |
| **Scale** | 500 | 200 | 100 | 30 | $7,670 |

---

## 6. Late.dev Integration Cost Analysis

This is the biggest variable cost. Detailed breakdown:

### 6.1 How Late.dev Scales

| Your Sellers with Social | Late Plan Needed | Monthly Cost | Cost/Profile |
|--------------------------|------------------|--------------|--------------|
| 1-10 | Build | $13 | $1.30 |
| 11-50 | Accelerate | $33 | $0.66-$3.00 |
| 51-100 | Unlimited | $99 | $0.99-$1.94 |
| 100+ | Enterprise | Custom | ~$0.50-1.00 |

### 6.2 Breakeven on Social Publishing

If you include social publishing in Pro+ tiers:

| Tier | Price | Late Cost | Other Costs | Profit |
|------|-------|-----------|-------------|--------|
| Pro | $15 | $0.66 | $0.84 | **$13.50** |
| Business | $29 | $0.66 | $1.84 | **$26.50** |
| Enterprise | $59 | $0.66 | $4.34 | **$54.00** |

**Even at full Late.dev cost, margins are 90%+**

### 6.3 Strategy Recommendation

1. **Limit Free tier to 0 social publishing** - no cost exposure
2. **Pro tier: 1 platform** - covers Instagram (most important for makers)
3. **Business: 3 platforms** - Instagram, Facebook, TikTok
4. **Enterprise: All platforms** - Full access

---

## 7. Risk Analysis

### 7.1 Cost Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Late.dev price increase | Medium | High | Annual prepay, negotiate |
| R2 pricing change | Low | Low | Minimal current cost |
| Railway price increase | Low | Medium | Easy to migrate VPS |
| Stripe fee increase | Medium | Low | Passed to revenue |

### 7.2 Revenue Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low conversion to paid | High | High | Strong free→paid funnel |
| High churn | Medium | High | Feature value, community |
| Competition undercutting | Medium | Medium | Focus on "Australian" angle |

---

## 8. Recommendations

### 8.1 Immediate Actions

1. **Implement new tier pricing** ($15/$29/$59 instead of $19/$39/$79)
2. **Add storage limits per tier** (currently unlimited = risk)
3. **Implement social platform limits** (1/3/unlimited)
4. **Add AI caption quotas** (20/100/unlimited)

### 8.2 Infrastructure

1. **Stay on NUC for development**
2. **Deploy to Railway $6 plan initially**
3. **Use self-hosted MongoDB** (save $57/mo vs Atlas)
4. **Cloudflare Free** (no need for Pro)
5. **R2 for all storage** ($0 egress is key)

### 8.3 Cost Optimization

1. **Annual billing discount** - Push yearly plans (save 2 months)
2. **Late.dev annual** - 4 months free with annual
3. **Batch AI requests** - Reduce API calls
4. **Image optimization** - Reduce R2 storage needs

---

## 9. Summary

### Total Cost of Ownership

| Stage | Users | Monthly Cost | Revenue (est) | Profit |
|-------|-------|--------------|---------------|--------|
| **MVP** | 100 | $21 | $296 | $275 |
| **Growth** | 500 | $88 | $1,625 | $1,537 |
| **Scale** | 2000 | $245 | $7,670 | $7,425 |

### Key Insights

1. **Zero transaction fees is sustainable** - Subscription model covers all costs
2. **Late.dev is the biggest variable** - But still affordable at scale
3. **R2's $0 egress is massive** - Would cost $500+/mo on AWS at scale
4. **90%+ margins achievable** - Even with all integrations
5. **Breakeven at 2 Pro subscribers** - Very low barrier

---

## Sources

### Hosting & Infrastructure
- [Railway Pricing](https://www.vultr.com/pricing/)
- [Railway Cloud Compute](https://www.vultr.com/products/cloud-compute/)

### Storage
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 Pricing Calculator](https://r2-calculator.cloudflare.com/)

### Database
- [MongoDB Atlas Pricing](https://www.mongodb.com/pricing)
- [Atlas M0 Limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)

### APIs
- [Late.dev Pricing](https://getlate.dev/pricing)
- [Resend Pricing](https://resend.com/pricing)
- [Anthropic Claude Pricing](https://www.anthropic.com/pricing)

### Payments
- [Stripe Australia Pricing](https://stripe.com/au/pricing)

### CDN
- [Cloudflare Free Plan](https://www.cloudflare.com/plans/free/)
