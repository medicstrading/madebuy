# MadeBuy Paid Components & Cost Analysis

> All figures in **Australian Dollars (AUD)** unless noted.
> USD costs converted at 1 USD = 1.54 AUD (~0.65 exchange rate)

---

## Business Model

**Subscription-only revenue** — No transaction fees on tenant sales.
- Tenants pay monthly/annual subscription
- Tenants keep 100% of their sales revenue
- Stripe Connect used for tenant checkouts (tenants pay their own Stripe fees)

---

## Current Pricing Tiers

| Tier | Price | Key Limits |
|------|-------|------------|
| **Starter** | $0/mo | 5 products, 50MB storage, 10 orders/mo |
| **Maker** | $15/mo | 50 products, 500MB storage, custom domain, 20 AI captions |
| **Professional** | $29/mo | 200 products, 2GB storage, 100 AI captions, 3 social platforms |
| **Studio** | $59/mo | Unlimited products, 10GB storage, unlimited AI captions |

**Annual pricing:** 17% discount

---

## Service Stack

| Service | Purpose | Pricing (USD) | Pricing (AUD) |
|---------|---------|---------------|---------------|
| MongoDB Atlas | Database hosting | Free → $57/mo | Free → ~$88/mo |
| Railway | Hosting (admin + web) | ~$5-20/mo base | ~$8-31/mo |
| Cloudflare R2 | Image/media storage | $0.015/GB | ~$0.023/GB |
| OpenAI GPT-4o-mini | AI captions | ~$0.0002/caption | ~$0.0003/caption |
| Resend | Transactional emails | Free 100/day | Free 100/day |
| Payment processor | Subscription billing | See comparison below | See comparison below |
| Late.dev | Social publishing | Subscription | Subscription |

---

## Payment Processor Comparison

Since MadeBuy only needs subscription billing (not marketplace splits), simpler/cheaper options are available:

| Provider | Fee Structure | On $15/mo | On $59/mo | Best For |
|----------|---------------|-----------|-----------|----------|
| **GoCardless** | 1% + $0.30 | $0.45 (3.0%) | $0.89 (1.5%) | Direct debit (cheapest) |
| **Square** | 1.6% flat | $0.24 (1.6%) | $0.94 (1.6%) | Card payments |
| **Stripe** | 1.75% + $0.30 | $0.56 (3.7%) | $1.33 (2.3%) | Flexibility |
| **Paddle** | 5% + $0.50 | $1.25 (8.3%) | $3.45 (5.8%) | Tax handling |

### Recommended: GoCardless + Square Hybrid

- **GoCardless** as default (direct debit) — cheapest, lower churn
- **Square** as fallback (card payments) — no per-transaction fee

### Annual Payment Fee Comparison (1000 tenants, ~$20 ARPU)

| Provider | Monthly Fees | Annual Fees | vs Stripe |
|----------|--------------|-------------|-----------|
| Stripe | ~$470 | ~$5,640 | — |
| Square | ~$320 | ~$3,840 | Save $1,800 |
| GoCardless | ~$270 | ~$3,240 | Save $2,400 |
| **Hybrid (50/50)** | ~$295 | ~$3,540 | **Save $2,100** |

---

## GPT-4o-mini Pricing Breakdown

| Token Type | USD per 1M tokens | USD per 1K tokens |
|------------|-------------------|-------------------|
| Input | $0.15 | $0.00015 |
| Output | $0.60 | $0.0006 |

**Per caption estimate** (~500 input tokens, ~200 output tokens):
- Input cost: $0.000075 USD
- Output cost: $0.00012 USD
- **Total: ~$0.0002 USD / ~$0.0003 AUD per caption**

---

## Per-Tenant Cost Breakdown

### Variable Per-Tenant Costs (AUD)

| Resource | Tier Limits | Actual Cost/mo | Margin |
|----------|-------------|----------------|--------|
| **Storage (R2)** | | | |
| Starter 50MB | | ~$0.001 | Negligible |
| Maker 500MB | | ~$0.012 | $15 revenue → 99.9% |
| Pro 2GB | | ~$0.05 | $29 revenue → 99.8% |
| Studio 10GB | | ~$0.23 | $59 revenue → 99.6% |
| **AI Captions (GPT-4o-mini)** | | | |
| Maker 20/mo | | ~$0.006 | <0.1% of revenue |
| Pro 100/mo | | ~$0.03 | <0.2% of revenue |
| Studio 500/mo avg | | ~$0.15 | <0.3% of revenue |
| **Email (Resend)** | | | |
| All tiers | | ~$0.002/email | Free tier covers most |

---

## Margin Analysis by Tier

### Infrastructure Only (excl. payment fees)

| Tier | Revenue | Infra Cost | Gross Margin |
|------|---------|------------|--------------|
| **Starter** | $0 | ~$0.01 | Loss leader |
| **Maker** | $15 | ~$0.02 | **~99.9%** |
| **Professional** | $29 | ~$0.08 | **~99.7%** |
| **Studio** | $59 | ~$0.40 | **~99.3%** |

### True Margin (with GoCardless)

| Tier | Revenue | Infra Cost | Payment Fee | Total Cost | Net Profit | True Margin |
|------|---------|------------|-------------|------------|------------|-------------|
| **Maker** | $15 | $0.02 | $0.45 | $0.47 | $14.53 | **97%** |
| **Professional** | $29 | $0.08 | $0.59 | $0.67 | $28.33 | **98%** |
| **Studio** | $59 | $0.40 | $0.89 | $1.29 | $57.71 | **98%** |

### True Margin (with Stripe — current)

| Tier | Revenue | Infra Cost | Payment Fee | Total Cost | Net Profit | True Margin |
|------|---------|------------|-------------|------------|------------|-------------|
| **Maker** | $15 | $0.02 | $0.56 | $0.58 | $14.42 | **96%** |
| **Professional** | $29 | $0.08 | $0.81 | $0.89 | $28.11 | **97%** |
| **Studio** | $59 | $0.40 | $1.33 | $1.73 | $57.27 | **97%** |

---

## Scaling Projections (All AUD)

### Infrastructure Costs at Scale

| Tenants | Railway | MongoDB | R2 Storage | AI Costs | Total/mo |
|---------|---------|---------|------------|----------|----------|
| 10 | $15 | $0 (free) | $0.80 | $0.50 | ~$16 |
| 100 | $38 | $0 (free) | $8 | $5 | ~$51 |
| 500 | $77 | $88 (M10) | $38 | $25 | ~$228 |
| 1000 | $154 | $88 | $77 | $50 | ~$369 |
| 5000 | $308 | $231 (M20) | $385 | $250 | ~$1,174 |

### Revenue & Profit at Scale (with GoCardless)

**Assumptions:**
- 60% paid conversion
- ~$20 AUD ARPU (weighted toward Maker tier)
- Tier mix: 40% Free, 35% Maker, 18% Pro, 7% Studio
- GoCardless payment fees: 1% + $0.30

| Tenants | Paid Users | Revenue/mo | Infra Cost | Payment Fees | Total Cost | Profit/mo | Margin |
|---------|------------|------------|------------|--------------|------------|-----------|--------|
| 10 | 6 | $120 | $16 | $4 | $20 | $100 | 83% |
| 100 | 60 | $1,200 | $51 | $38 | $89 | $1,111 | 93% |
| 500 | 300 | $6,000 | $228 | $190 | $418 | $5,582 | 93% |
| 1000 | 600 | $12,000 | $369 | $380 | $749 | $11,251 | 94% |
| 5000 | 3000 | $60,000 | $1,174 | $1,900 | $3,074 | $56,926 | 95% |

### Annual Revenue (ARR)

| Tenants | MRR | ARR | Annual Profit |
|---------|-----|-----|---------------|
| 10 | $120 | $1,440 | ~$1,200 |
| 100 | $1,200 | $14,400 | ~$13,332 |
| 500 | $6,000 | $72,000 | ~$66,984 |
| 1000 | $12,000 | $144,000 | ~$135,012 |
| 5000 | $60,000 | $720,000 | ~$683,112 |

---

## Business Milestones

| Milestone | Tenants Needed | MRR | ARR |
|-----------|----------------|-----|-----|
| Break-even | ~3 | ~$36 | ~$432 |
| Side income | ~50 | ~$600 | ~$7,200 |
| Part-time viable | ~150 | ~$1,800 | ~$21,600 |
| Full-time viable | ~300 | ~$3,600 | ~$43,200 |
| Solid business | ~1000 | ~$12,000 | ~$144,000 |
| Scale mode | ~5000 | ~$60,000 | ~$720,000 |

---

## Key Cost Drivers

### 1. Payment Processing — Biggest Cost
| Provider | At 1000 tenants/mo | Annual |
|----------|-------------------|--------|
| Stripe | ~$470 | ~$5,640 |
| GoCardless | ~$270 | ~$3,240 |
| **Savings** | ~$200/mo | **~$2,400/yr** |

### 2. AI Captions (GPT-4o-mini) — Negligible
- ~$0.0003 AUD per caption
- 1000 captions = ~$0.30 AUD
- **Essentially free**

### 3. Storage (Cloudflare R2) — Very Cheap
- ~$0.023 AUD/GB/month
- No egress fees
- **No concerns**

### 4. Late API — Monitor
- Check if per-post or flat rate
- Could grow with adoption

---

## Cheaper Alternatives Summary

| Current | Alternative | Savings | Trade-off |
|---------|-------------|---------|-----------|
| **Stripe** | **GoCardless** | **~$2,400/yr at 1000 users** | Direct debit only |
| Railway | Railway on VPS | ~$20-50/mo | Self-managed |
| MongoDB Atlas | Self-hosted | ~$50-80/mo | You handle backups |
| GPT-4o-mini | Local LLaMA | Negligible | Already dirt cheap |

**Priority:** Switch payment processor first — biggest savings by far.

---

## Recommendations

1. **Switch to GoCardless** — Save ~40% on payment fees
2. **Offer Square as backup** — For customers who prefer cards
3. **"Unlimited AI" is safe** — GPT-4o-mini is essentially free
4. **Annual discounts work** — 17% off improves cash flow
5. **Free tier is strategic** — Limited enough to push upgrades
6. **Add usage alerts** — Notify at 80% of limits to drive upgrades

---

## Comparison with Sarasite Stack

| Component | Sarasite | MadeBuy | Difference |
|-----------|----------|---------|------------|
| Hosting | Vercel | Railway | Railway more flexible |
| Database | MongoDB Atlas | MongoDB Atlas | Same |
| Storage | Cloudflare R2 | Cloudflare R2 | Same |
| Video | Cloudflare Stream | Local ffmpeg + R2 | MadeBuy cheaper |
| AI | OpenAI (GPT-4) | OpenAI (GPT-4o-mini) | MadeBuy 10x cheaper |
| Email | Resend | Resend | Same |
| Payments | Stripe + PayPal | GoCardless + Square | MadeBuy cheaper |
| Social | Late.dev | Late.dev | Same |

---

## Stripe Connect Note

Stripe Connect is still used for **tenant checkout** (when customers buy from sellers). However:
- Tenants pay their own Stripe fees on sales
- MadeBuy doesn't take a cut of sales
- MadeBuy only pays subscription billing fees (GoCardless/Square recommended)

---

*Last updated: January 2026*
*Exchange rate: 1 USD = 1.54 AUD*
*GPT-4o-mini: $0.15/1M input, $0.60/1M output tokens*
*GoCardless: 1% + $0.30 AUD per transaction*
