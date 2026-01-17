# Sarasite → MadeBuy Enhancement Plan

## Overview

Analysis of recent sarasite commits compared to madebuy's current state. Identified transferable features that fit madebuy's marketplace model.

---

## High-Value Enhancements (Easy Wins)

### 1. **Dynamic OG/Twitter Images** ⭐⭐⭐
**Sarasite commit:** `cb7552c`

MadeBuy currently has NO dynamic OG images. Products shared on social media show generic site image.

**What to port:**
- `opengraph-image.tsx` and `twitter-image.tsx` route handlers
- Product-specific OG images showing product photo, price, seller name
- Site-level fallback OG image

**Effort:** Low-Medium (pattern is established in sarasite)
**Impact:** High - massive improvement to social sharing/virality

---

### 2. **ISR Caching Strategy** ⭐⭐⭐
**Sarasite commit:** `cb7552c`

MadeBuy has `cache.ts` but pages mostly use dynamic rendering. No `revalidate` exports on pages.

**What to port:**
- Add `export const revalidate = X` to all public pages
- Remove unnecessary `noStore()` calls
- Add `generateStaticParams` for pre-building popular product pages

**Suggested revalidation times:**
| Page | Revalidate |
|------|------------|
| Homepage | 2 min |
| Category/Collection | 5 min |
| Product pages | 10 min (more listings = more churn) |
| Blog/Static | 30 min |

**Effort:** Low
**Impact:** High - faster page loads, lower server costs

---

### 3. **AVIF Image Format** ⭐⭐
**Sarasite commit:** `cb7552c`

MadeBuy's `next.config.js` only has WebP. AVIF is 20-30% smaller.

**What to port:**
```js
images: {
  formats: ['image/avif', 'image/webp'],
}
```

**Effort:** Trivial (one line)
**Impact:** Medium - faster loads, less bandwidth

---

### 4. **Structured Data / Schema.org** ⭐⭐⭐
**Sarasite commits:** `0c42eae`, `cb7552c`

MadeBuy has NO structured data. Missing:
- Product schema (critical for Google Shopping)
- Organization schema
- FAQPage schema
- Breadcrumb schema
- Person schema (for sellers)

**What to port:**
- Product schema on product pages (price, availability, reviews, seller)
- Organization schema in layout
- Seller profile schema (Person/LocalBusiness)
- Breadcrumb component with schema

**Effort:** Medium
**Impact:** Very High - Google rich results, shopping tabs, better SEO

---

### 5. **Web Vitals to GA4** ⭐⭐
**Sarasite commit:** `cb7552c`

Track Core Web Vitals (LCP, FID, CLS) to Google Analytics for performance monitoring.

**What to port:**
- `web-vitals.tsx` component
- Hook into layout

**Effort:** Low
**Impact:** Medium - visibility into real user performance

---

## Medium-Value Enhancements

### 6. **Recurring Scheduled Posts** ⭐⭐
**Sarasite commit:** `69ece3f`

MadeBuy has basic `scheduledFor` date in PublishComposer but no recurrence.

**What to port:**
- RecurrenceConfig type (interval, count, tracking)
- Repository functions for child occurrence creation
- Cron job updates for recurrence handling
- UI toggle for "Repeat this post" with interval/count

**Effort:** Medium (437 lines of changes in sarasite)
**Impact:** Medium - useful for sellers doing regular promo posts

---

### 7. **Schedule UI Redesign** ⭐
**Sarasite commit:** `7816303`

Polished card layout with gradient accents, animated toggles, expand/collapse.

**What to port:**
- Card container styling pattern
- Animated toggle component
- Expand/collapse animation for options

**Effort:** Medium
**Impact:** Low-Medium - polish, not functionality

---

### 8. **Video-Only Filter in Media** ⭐⭐
**Sarasite commits:** `a471f90`, `e10291c`

Filter media library to show only items with video. Useful for TikTok/Reels content.

**What to port:**
- Toggle component in media library header
- Filter logic in media queries
- Video badge on media thumbnails

**Effort:** Low
**Impact:** Medium - helpful for video-first sellers

---

### 9. **Collapsible Media Sections** ⭐
**Sarasite commit:** `a471f90`

Collapsible chevron sections in media library. Saves state to localStorage.

**What to port:**
- Collapsible section component
- localStorage persistence

**Effort:** Low
**Impact:** Low - nice UX polish

---

### 10. **Video Player Modal** ⭐
**Sarasite commit:** `a471f90`

Click video thumbnail → full modal playback (not inline).

MadeBuy already has `VideoPlayer.tsx` but could add modal wrapper.

**Effort:** Low
**Impact:** Low - UX improvement

---

## Not Recommended to Port

### Google Merchant API Migration
Sarasite migrated to Merchant API v1. MadeBuy already has eBay/Etsy integrations and different marketplace focus. Not applicable.

### Video Transcoding Worker
Sarasite has elaborate MJPEG handling, FFmpeg fixes. MadeBuy likely doesn't need this complexity unless doing heavy video processing.

### Late.dev API Timeouts
Sarasite-specific integration. MadeBuy uses different services.

---

## Recommended Implementation Order

| Priority | Enhancement | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | Structured Data (Product + Org schema) | Medium | Very High |
| 2 | Dynamic OG Images | Low-Med | High |
| 3 | ISR Caching Strategy | Low | High |
| 4 | AVIF Image Format | Trivial | Medium |
| 5 | Web Vitals Tracking | Low | Medium |
| 6 | Video-Only Filter | Low | Medium |
| 7 | Recurring Posts | Medium | Medium |

---

## Quick Wins (Can Do Today)

1. **AVIF format** - One line in next.config.js
2. **ISR exports** - Add `export const revalidate` to pages
3. **Web Vitals** - Copy component, add to layout

## This Week

4. **Structured Data** - Product schema first, then Organization
5. **Dynamic OG Images** - Start with product pages

## Next Sprint

6. **Video filters** - Nice-to-have UX
7. **Recurring posts** - Feature parity with sarasite

---

*Generated by System Manager - comparing sarasite and madebuy codebases*
