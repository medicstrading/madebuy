# IP Protection & Anti-Scraping Measures for MadeBuy Marketplace

## Overview

Protecting makers' intellectual property (product images, designs, descriptions) from scraping and theft is critical for marketplace trust. This document outlines recommended protection strategies.

## User Concern

> "Scrape protection to minimize IP theft from this site. This is a key area of concern for makers."

Makers invest significant time and resources creating unique products. Automated scraping of product images, descriptions, and pricing can lead to:
- Copied product listings on competitor platforms
- Counterfeit production based on stolen designs
- Price undercutting by dropshippers
- Loss of competitive advantage

---

## Recommended Protection Layers

### 1. Rate Limiting (Priority: HIGH)

**Implementation:**
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
})

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Too Many Requests', { status: 429 })
  }

  return NextResponse.next()
}
```

**Configuration:**
- Anonymous users: 10 requests/10 seconds
- Authenticated buyers: 30 requests/10 seconds
- Sellers (own products): Unlimited
- Block IPs with >100 product views in 1 minute

**Tools:**
- Upstash Redis + Ratelimit (@upstash/ratelimit)
- Vercel Edge Middleware
- Cloudflare Rate Limiting (if using Cloudflare)

---

### 2. Image Watermarking (Priority: MEDIUM)

**Dynamic Watermarks:**
```typescript
// apps/web/src/app/api/images/[id]/route.ts
import sharp from 'sharp'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const imageBuffer = await getImageFromR2(params.id)

  // Add dynamic watermark
  const watermarked = await sharp(imageBuffer)
    .composite([{
      input: Buffer.from(`
        <svg width="200" height="50">
          <text x="10" y="40" font-size="20" fill="white" opacity="0.3">
            MadeBuy.com
          </text>
        </svg>
      `),
      gravity: 'southeast',
    }])
    .toBuffer()

  return new Response(watermarked, {
    headers: { 'Content-Type': 'image/jpeg' },
  })
}
```

**Strategies:**
- Subtle corner watermark on all marketplace images
- Seller name + "MadeBuy" branding
- Higher resolution images only for authenticated users
- Original images (no watermark) only for actual buyers

**Libraries:**
- `sharp` - Image processing
- `@vercel/og` - Dynamic SVG watermarks

---

### 3. Right-Click Protection (Priority: LOW)

**Disable right-click on product images:**
```tsx
// components/marketplace/ProductImage.tsx
export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      <Image
        src={src}
        alt={alt}
        draggable={false}
        className="select-none"
      />
    </div>
  )
}
```

**CSS Protection:**
```css
/* Prevent image dragging and selection */
img.protected {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  pointer-events: none;
}

/* Disable drag */
img.protected {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
}
```

**Note:** This is easily bypassed (inspect element, screenshot) but deters casual users.

---

### 4. Bot Detection (Priority: HIGH)

**Cloudflare Turnstile (Free, no CAPTCHA):**
```tsx
// app/marketplace/product/[id]/page.tsx
import { Turnstile } from '@marsidev/react-turnstile'

export function ProductPage() {
  return (
    <div>
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        onSuccess={(token) => {
          // User verified as human
          fetch('/api/verify-turnstile', {
            method: 'POST',
            body: JSON.stringify({ token }),
          })
        }}
      />
    </div>
  )
}
```

**Server-side verification:**
```typescript
// app/api/verify-turnstile/route.ts
export async function POST(req: Request) {
  const { token } = await req.json()

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  })

  const data = await response.json()

  if (!data.success) {
    return new Response('Bot detected', { status: 403 })
  }

  return new Response('Verified')
}
```

**Alternatives:**
- hCaptcha (privacy-focused)
- reCAPTCHA v3 (invisible)
- Custom honeypot fields

---

### 5. User-Agent Blocking (Priority: MEDIUM)

**Block known scrapers:**
```typescript
// middleware.ts
const BLOCKED_USER_AGENTS = [
  'scrapy',
  'beautifulsoup',
  'python-requests',
  'wget',
  'curl',
  'selenium',
  'puppeteer',
]

export function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''

  if (BLOCKED_USER_AGENTS.some(bot => userAgent.includes(bot))) {
    return new Response('Forbidden', { status: 403 })
  }

  return NextResponse.next()
}
```

**Note:** Sophisticated scrapers will spoof user agents.

---

### 6. Lazy Loading with Authentication (Priority: MEDIUM)

**Hide full images until user scrolls:**
```tsx
'use client'

import { useInView } from 'react-intersection-observer'

export function LazyProductImage({ productId, lowQualitySrc, highQualitySrc }: Props) {
  const { ref, inView } = useInView({ triggerOnce: true })
  const [authenticated, setAuthenticated] = useState(false)

  return (
    <div ref={ref}>
      {inView ? (
        <Image src={authenticated ? highQualitySrc : lowQualitySrc} />
      ) : (
        <div className="skeleton" />
      )}
    </div>
  )
}
```

**Strategy:**
- Show low-res (400px) thumbnails by default
- Load high-res (1600px) only for authenticated users
- Original images only after purchase

---

### 7. API Key Requirements (Priority: HIGH)

**Require API keys for bulk access:**
```typescript
// app/api/marketplace/products/route.ts
export async function GET(req: Request) {
  const apiKey = req.headers.get('x-api-key')

  // Rate limit more strictly for API access
  if (!apiKey) {
    // Anonymous: 10 products per page max
    return getProducts({ limit: 10 })
  }

  // Verified API key: higher limits
  if (await verifyApiKey(apiKey)) {
    return getProducts({ limit: 100 })
  }

  return new Response('Forbidden', { status: 403 })
}
```

---

### 8. Content Delivery Network (CDN) Protection

**Cloudflare Features (if using Cloudflare):**
- **Hotlink Protection**: Prevent direct image linking from other domains
- **WAF Rules**: Block suspicious traffic patterns
- **Challenge Page**: Show CAPTCHA for suspicious visitors
- **IP Reputation**: Block known bad actors

**Configuration:**
```
# Cloudflare Firewall Rule
(http.referer ne "madebuy.com" and http.request.uri.path contains "/images/")
→ Block
```

---

### 9. Legal Protection

**Terms of Service:**
```markdown
## Intellectual Property

All product images, descriptions, and designs remain the property of the respective sellers.

Prohibited actions:
- Automated scraping or data extraction
- Reproduction of product images without permission
- Using our content on competing platforms
- Creating derivative works from seller content

Violators will:
- Be permanently banned
- Face legal action under DMCA
- Be reported to hosting providers
```

**DMCA Takedown Process:**
- Sellers can report stolen content
- MadeBuy assists with DMCA claims
- Automated monitoring for stolen images (Google Image Search API)

---

### 10. Monitoring & Alerts

**Detect scraping patterns:**
```typescript
// lib/scrape-detection.ts
export async function detectScraping(userId: string, ip: string) {
  const recentViews = await db.analytics.count({
    where: {
      userId,
      ip,
      action: 'product_view',
      createdAt: { gte: subMinutes(new Date(), 5) },
    },
  })

  // Alert if >50 products viewed in 5 minutes
  if (recentViews > 50) {
    await sendAlert({
      type: 'potential_scraper',
      userId,
      ip,
      count: recentViews,
    })

    // Soft ban (show 429 for 24 hours)
    await redis.set(`ban:${ip}`, '1', 'EX', 86400)
  }
}
```

**Alerting:**
- Slack notifications for suspicious activity
- Log to Sentry/Datadog
- Email sellers if their products are being bulk-accessed

---

## Implementation Priority

### Phase 1 (Immediate - Pre-Launch)
1. ✅ Rate limiting (Upstash + Vercel Edge)
2. ✅ Bot detection (Cloudflare Turnstile)
3. ✅ User-Agent blocking

### Phase 2 (Week 1 Post-Launch)
4. Image watermarking (sharp + dynamic SVG)
5. API key requirements
6. Basic scrape detection alerts

### Phase 3 (Month 1)
7. Cloudflare WAF rules
8. Advanced monitoring dashboard
9. Lazy loading + authentication tiers

### Phase 4 (Ongoing)
10. DMCA process automation
11. Google Image Search monitoring
12. Machine learning for anomaly detection

---

## Cost Estimate

| Tool | Cost | Notes |
|------|------|-------|
| Upstash Redis | $0 (10K req/day) | Rate limiting |
| Cloudflare Turnstile | Free | Bot detection |
| Sharp (image processing) | Free | Server-side library |
| Cloudflare WAF | $5/mo | If using Cloudflare Pro |
| Sentry (monitoring) | $26/mo | Error tracking + alerts |

**Total: ~$31/month** for comprehensive protection

---

## Seller Education

**Help Center Article: "How We Protect Your Designs"**
```markdown
# How MadeBuy Protects Your Intellectual Property

We take IP protection seriously. Here's how we safeguard your work:

✅ Rate limiting prevents bulk scraping
✅ Bot detection blocks automated tools
✅ Image watermarks deter casual theft
✅ High-res images only for verified buyers
✅ DMCA takedown support
✅ 24/7 monitoring for suspicious activity

## What You Can Do
- Watermark your own images before upload
- Use Copyright symbols in descriptions (©)
- Enable "buyer-only full resolution" in settings
- Report stolen content immediately
```

---

## Alternatives: No Images Until Inquiry

**Extreme protection (Etsy-style):**
- Blur product images on marketplace
- Require users to message seller for photos
- Share full images only via private conversation

**Pros:**
- Maximum IP protection
- Forces buyer engagement

**Cons:**
- Poor user experience
- Reduces conversion rates
- Not recommended for MadeBuy (UX-first approach)

---

## Recommended Stack

```typescript
// package.json additions
{
  "dependencies": {
    "@upstash/ratelimit": "^1.0.0",
    "@upstash/redis": "^1.28.0",
    "@marsidev/react-turnstile": "^0.5.0",
    "sharp": "^0.33.0"
  }
}
```

```typescript
// Environment variables
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

---

## Next Steps

1. **Review with team**: Discuss priority and budget
2. **Implement Phase 1**: Rate limiting + bot detection (2-3 days)
3. **Test scraping defenses**: Try to scrape own site, measure effectiveness
4. **Seller communication**: Announce IP protection features in launch blog post
5. **Monitor & iterate**: Adjust based on actual scraping attempts

This is an ongoing effort - scrapers evolve, so defenses must too.
