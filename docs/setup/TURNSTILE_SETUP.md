# Cloudflare Turnstile Setup Guide

## Overview

Cloudflare Turnstile is a free, privacy-friendly alternative to CAPTCHA that detects bots without user friction.

**Effort:** 2-3 hours (setup + integration)
**Cost:** $0 (unlimited challenges, free forever)
**Impact:** High - blocks automated scrapers effectively

---

## Why Turnstile?

✅ **Free & Unlimited** - No usage limits
✅ **No CAPTCHA** - Invisible or minimal user interaction
✅ **Privacy-focused** - No tracking or data collection
✅ **High accuracy** - Better bot detection than reCAPTCHA v3
✅ **Easy integration** - Simple React component

---

## Step 1: Get Turnstile Keys

1. Go to [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/turnstile)
2. Click **"Add Site"**
3. Configure:
   - **Site Name:** `MadeBuy Marketplace`
   - **Domain:** `madebuy.com` (or `localhost` for development)
   - **Widget Mode:** `Managed` (recommended)
4. Click **Create**
5. Copy both keys:
   - **Site Key** (public) → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** (private) → `TURNSTILE_SECRET_KEY`

---

## Step 2: Add Environment Variables

Add to `/apps/web/.env.local`:

```bash
# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA... # Your site key
TURNSTILE_SECRET_KEY=0x4AAAAAAA...          # Your secret key
```

**Important:**
- `NEXT_PUBLIC_` prefix makes it accessible in browser
- Secret key should NEVER be exposed to client

---

## Step 3: Implementation

### Already Implemented ✅

We've integrated Turnstile on product detail pages to protect high-res images:

**Components:**
- `TurnstileChallenge.tsx` - Turnstile widget wrapper
- `ProtectedProductGallery.tsx` - Image gallery with Turnstile gate
- `/api/marketplace/verify-turnstile/route.ts` - Server-side verification

**How it works:**
1. User visits product page
2. Sees Turnstile challenge before viewing full gallery
3. Token sent to `/api/marketplace/verify-turnstile`
4. Server validates with Cloudflare
5. If verified, high-res images are revealed

---

## Testing

### Development Testing:

For local development, you can use Turnstile's test keys:

```bash
# These always pass (development only!)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### Production Testing:

1. Visit a product page: `https://madebuy.com/marketplace/product/[id]`
2. You should see the Turnstile challenge
3. Complete it (usually automatic/invisible)
4. Gallery should load

### Verify Server-Side:

Check logs for verification requests:
```bash
vercel logs --production
# Should see successful verifications
```

---

## Configuration Options

### Widget Modes:

1. **Managed** (recommended) - Invisible for most users
2. **Non-Interactive** - Always invisible (higher false positives)
3. **Invisible** - Similar to Managed but more aggressive

### Customization:

In `TurnstileChallenge.tsx`, you can customize:

```typescript
<Turnstile
  siteKey={...}
  options={{
    theme: 'light',  // or 'dark' or 'auto'
    size: 'normal',  // or 'compact'
    language: 'en',  // or auto-detect
  }}
/>
```

---

## Security Best Practices

### ✅ Do:
- Always verify tokens server-side
- Set short token expiry (default: 300s)
- Monitor failure rates in Cloudflare dashboard
- Use HTTPS in production

### ❌ Don't:
- Trust client-side verification alone
- Reuse tokens (one-time use only)
- Expose secret key to client
- Skip IP verification in API route

---

## Monitoring

### Cloudflare Dashboard:

1. Go to [Turnstile Analytics](https://dash.cloudflare.com/turnstile)
2. View metrics:
   - Total challenges
   - Success rate
   - Top countries
   - Suspected bot traffic

### Alert on High Bot Traffic:

If you see >50% challenge failures:
- Investigate if legitimate users are blocked
- Check for scraping attempts
- Review Cloudflare logs

---

## Troubleshooting

### "Invalid site key" error:
- Check `NEXT_PUBLIC_` prefix on site key
- Verify domain matches Cloudflare configuration
- Clear browser cache

### "Verification failed" error:
- Check secret key is correct
- Ensure server can reach `challenges.cloudflare.com`
- Verify token hasn't expired (5 min limit)

### High failure rate:
- Check widget mode (switch to Managed)
- Review blocked countries in Cloudflare
- Test with different browsers/devices

---

## Performance Impact

**Client-side:**
- Widget script: ~23KB gzipped
- Loads asynchronously (no blocking)
- First challenge: ~200-500ms
- Subsequent challenges: ~50-100ms

**Server-side:**
- Verification API call: ~100-200ms
- Cloudflare globally distributed (low latency)

**Overall:** Minimal impact, worth the security benefit

---

## Rollout Strategy

### Phase 1 (Current):
✅ Product detail pages only
- Protects high-res images
- Low friction (automated for most users)

### Phase 2 (Optional):
- Add to seller registration
- Add to review submission
- Add to contact forms

### Phase 3 (If needed):
- Add to search/browse (only if abuse detected)
- Progressive challenges (escalate if suspicious)

---

## Alternative: Progressive Challenges

Instead of showing Turnstile to everyone, show it only to suspicious users:

```typescript
// Pseudo-code for future enhancement
if (isHighRisk(user)) {
  showTurnstile()
} else {
  showProductImages()
}

function isHighRisk(user) {
  // Check:
  // - Too many product views in short time
  // - Suspicious user agent
  // - Known bot IP ranges
  // - No cookies/JS enabled
}
```

---

## Cost Comparison

| Solution | Cost | User Friction | Bot Detection |
|----------|------|---------------|---------------|
| **Turnstile** | $0 | Low | High |
| reCAPTCHA v2 | $0 | High | Medium |
| reCAPTCHA v3 | $0 | None | Low |
| hCaptcha | $0.001/req | Medium | Medium |
| Custom Bot Detection | Dev time | Low | Varies |

**Winner:** Turnstile (best balance)

---

## Next Steps

✅ Get Cloudflare Turnstile keys
✅ Add to `.env.local`
✅ Test on product pages
🔄 Monitor analytics for first week
🔄 Adjust widget mode if needed
🔄 Consider adding to other flows (registration, reviews)

**Current Implementation:** Product gallery protection is LIVE and ready to use!
