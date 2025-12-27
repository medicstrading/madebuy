# Cloudflare Hotlink Protection Setup

## Overview

Hotlink protection prevents other websites from directly embedding your product images on their sites. This stops bandwidth theft and makes scraping less effective.

**Effort:** 2 minutes
**Cost:** $0 (included in Cloudflare free tier)
**Impact:** Medium - blocks direct image linking from external sites

---

## Setup Instructions

### Step 1: Access Cloudflare Dashboard

1. Log into your Cloudflare account
2. Select the `madebuy.com` domain
3. Navigate to **Scrape Shield** in the left sidebar

### Step 2: Enable Hotlink Protection

1. Find the **Hotlink Protection** toggle
2. Click to enable it
3. That's it! Changes take effect immediately.

---

## How It Works

When enabled, Cloudflare will:
- Check the `Referer` header on all image requests
- Block requests where the referer is not from `madebuy.com` or subdomains
- Allow direct access (no referer) from browsers
- Return a 403 Forbidden for blocked requests

---

## What Gets Protected

All images served from your domain:
- Product images in R2 bucket
- Seller avatars
- Gallery images
- Marketplace thumbnails

---

## Testing

### Verify It's Working:

1. Visit a marketplace product page: `https://madebuy.com/marketplace/product/[id]`
2. Open DevTools → Network tab
3. Find an image request
4. Right-click → Copy → Copy as cURL
5. Run the cURL command in terminal - should get 403 if hotlink protection is working

### Expected Behavior:

✅ **Allowed:**
- Images on `madebuy.com` pages
- Images on `*.madebuy.com` subdomains
- Direct browser access (typing URL in address bar)

❌ **Blocked:**
- Embedding images on other websites
- `<img src="https://madebuy.com/images/product.jpg" />` from `other-site.com`
- Scraper tools that don't spoof referer header

---

## Advanced Configuration (Optional)

If you need to allow specific domains (e.g., partner sites, email clients):

1. Go to **Firewall** → **Tools**
2. Create a **Firewall Rule**:
   ```
   (http.referer contains "partner-site.com" and http.request.uri.path contains "/images/")
   → Allow
   ```

---

## Limitations

- **Sophisticated scrapers can bypass** by spoofing the Referer header
- This is a **first line of defense**, not complete protection
- Combine with other measures (rate limiting, watermarking, Turnstile)

---

## Rollback

If you need to disable:
1. Return to **Scrape Shield** → **Hotlink Protection**
2. Toggle off
3. Changes are immediate

---

## Monitoring

Check blocked hotlink attempts:
1. **Analytics** → **Security**
2. Look for 403 errors on image paths
3. High numbers indicate scraping attempts

---

## Next Steps

✅ Enable Cloudflare Hotlink Protection (2 min)
🔄 Implement Turnstile on product pages (3 hrs)
🔄 Add image watermarking (1 day)
🔄 Set up rate limiting (4 hrs)

This works best as **part of a layered defense** strategy.
