# MadeBuy - Project Instructions

## Project Info

- **Name:** MadeBuy (PRIMARY project)
- **Purpose:** Etsy alternative marketplace - Shopify features + Etsy exposure, zero transaction fees
- **Stack:** Next.js 14, TypeScript, MongoDB, Tailwind CSS, Turborepo monorepo
- **Structure:** apps/admin, apps/web, packages/shared
- **Ports:** admin=3300, marketplace=3301
- **Deploy:** Railway (NOT Vultr/Coolify - those are deleted)
- **Git account:** medicstrading

## Core Rules

- Direct action over asking - just do tasks when requested
- Check logs before guessing when debugging
- Check environment settings first for issues
- Never suggest installing Sentry
- Security-conscious: always consider auth, validation, rate limiting
- Use git push only when explicitly told "push it"

## Docker/NUC Commands

Restart your containers on NUC:
```bash
nuc-docker restart madebuy
```

Other useful commands:
```bash
nuc-docker logs madebuy-web-dev     # View logs
nuc-docker ps                        # List containers
```

## Git Push Permission

NEVER push without explicit permission phrase: "push it", "push to github", "git push"

When permitted:
```bash
touch ~/.claude/.git-push-approved && git push
```

## Pre-Deployment Checklist

**BEFORE GOING LIVE - Complete these steps:**

### Stripe Connect Setup (REQUIRED)
- [ ] Get real Stripe API keys from https://dashboard.stripe.com/apikeys
- [ ] Update env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- [ ] Create webhook endpoint in Stripe Dashboard:
  - URL: `https://madebuy.com.au/api/webhooks/stripe-connect`
  - Events: `account.updated`, `account.application.deauthorized`, `payout.paid`, `payout.failed`, `charge.dispute.created`
- [ ] Add `STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...` to env
- [ ] Test tenant Stripe Connect flow end-to-end

### PayPal (Optional - Future)
- [ ] Apply for PayPal Commerce Platform partner approval
- [ ] Implement PayPal integration after approval

## Pre-Launch Checklist (Subscription Billing)

Before deploying the subscription billing system live:

1. **Create Stripe Products/Prices in Dashboard**
   - Maker: $15/month
   - Professional: $29/month  
   - Studio: $59/month

2. **Set environment variables**
   ```bash
   STRIPE_PRICE_MAKER_MONTHLY=price_xxx
   STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxx
   STRIPE_PRICE_STUDIO_MONTHLY=price_xxx
   ```

3. **Schedule monthly usage reset cron**
   - Endpoint: `/api/cron/reset-usage`
   - Schedule: `0 0 1 * *` (midnight on 1st of each month)
   - Vercel cron or external scheduler

4. **Set CRON_SECRET environment variable**
   - Generate: `openssl rand -hex 32`
   - Add to env: `CRON_SECRET=<generated_value>`

---

## NEXUS Model Routing (REQUIRED)

**When spawning agents via the Task tool, you MUST use NEXUS model routing.**

See the global CLAUDE.md (`~/.claude/CLAUDE.md`) for the full orchestration workflow.

### Quick Reference
```bash
# Classify task before spawning agent
python3 ~/.claude/nexus/classify.py "task description"
```

### Always Announce Routing
Before spawning any agent, output:
```
[NEXUS] → <tier> (<reason>, <confidence>% confidence)
```

### Tier Selection
| Tier | Use For |
|------|---------|
| Haiku | Formatting, docs, simple fixes (max 3 files) |
| Sonnet | Implementation, debugging, refactoring |
| Opus | Security, architecture, complex design |

Security/auth tasks → Always opus or sonnet minimum
