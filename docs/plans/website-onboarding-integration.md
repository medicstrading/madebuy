# Website Onboarding Integration Plan

## Implementation Status

### Milestone 1: Domain Connection ✅ COMPLETE (2026-01-04)

**Built:**
- Registration page (`/register`) with auto-login
- Onboarding flow (`/dashboard/onboarding`, `/dashboard/onboarding/domain`)
- Domain settings page (`/dashboard/settings/domain`)
- DNS instruction components (GoDaddy, Namecheap, Crazy Domains)
- Domain status badge component
- Tenant onboarding fields (`onboardingComplete`, `onboardingStep`)
- Auto-redirect for new users to onboarding

**Files created:**
- `apps/admin/src/app/(auth)/register/page.tsx`
- `apps/admin/src/app/api/auth/register/route.ts`
- `apps/admin/src/app/(dashboard)/dashboard/onboarding/page.tsx`
- `apps/admin/src/app/(dashboard)/dashboard/onboarding/domain/page.tsx`
- `apps/admin/src/app/(dashboard)/dashboard/settings/domain/page.tsx`
- `apps/admin/src/components/domain/DnsInstructions.tsx`
- `apps/admin/src/components/domain/DomainStatusBadge.tsx`

**Next:** Milestone 2 (Website Scanner - colors, fonts, logo extraction)

### Milestone 2: Website Scanner (Basic) ✅ COMPLETE (2026-01-04)

**Built:**
- Scanner package (`packages/scanner/`) with Cheerio-based extraction
- Color extractor - theme-color meta, CSS variables, button/link/header colors
- Typography extractor - Google Fonts detection, preset matching
- Logo extractor - header img detection, R2 upload
- Scan API route (`/api/onboarding/design/scan`)
- Accept/Decline API routes
- Design import UI page (`/dashboard/onboarding/design`)
- Updated onboarding hub to link to design import step
- Scanner types in shared package (`ExtractedDesign`, `DesignImportState`, etc.)
- Tenant field `domainOnboarding.designImport` for tracking import state

**Files created:**
- `packages/scanner/src/` - scanner package with extractors
- `packages/shared/src/types/scanner.ts` - shared types
- `apps/admin/src/app/api/onboarding/design/scan/route.ts`
- `apps/admin/src/app/api/onboarding/design/accept/route.ts`
- `apps/admin/src/app/api/onboarding/design/decline/route.ts`
- `apps/admin/src/app/(dashboard)/dashboard/onboarding/design/page.tsx`

**Next:** Milestone 3 (Full section detection) or Milestone 4 (Preview system)

### Milestone 3: Website Scanner (Full) ✅ COMPLETE (2026-01-04)

**Built:**
- Navigation extractor - detects nav items, labels, hrefs, mega-menu structure
- Section detector with pattern matching - hero, product-grid, testimonials, about, contact, features, gallery, faq, cta
- Template recommendation engine - scores sections and recommends classic-store, landing-page, portfolio, or magazine
- Confidence scoring for all extractions
- Updated ExtractedDesign type with navigation, sections, and templateMatch fields

**Files created:**
- `packages/scanner/src/extractors/navigation.ts`
- `packages/scanner/src/extractors/sections.ts`
- `packages/scanner/src/extractors/template-matcher.ts`

**Updated:**
- `packages/scanner/src/types.ts` - added NavItem, NavStructure, SectionType, DetectedSection, TemplateRecommendation
- `packages/shared/src/types/scanner.ts` - added same types for shared access
- `packages/scanner/src/scanner.ts` - integrated new extractors
- `packages/scanner/src/index.ts` - exported new extractors and types

**Next:** Milestone 4 (Preview system)

### Milestone 4: Preview System ✅ COMPLETE (2026-01-04)

**Built:**
- Preview storage repository (`packages/db/src/repositories/previews.ts`) with MongoDB TTL (24hr expiry)
- Preview API routes (`/api/onboarding/design/preview`) - POST to create, GET to check status
- Full preview page (`apps/web/src/app/preview/[previewId]/page.tsx`) with:
  - PreviewHeader with navigation items
  - PreviewHero with extracted colors and typography
  - PreviewFeatures, PreviewProducts, PreviewTestimonials, PreviewCTA
  - PreviewFooter with social links
  - DesignInfoPanel showing all extracted data
- Updated design page with:
  - Responsive device preview (desktop/tablet/mobile)
  - 6-panel grid showing colors, typography, navigation, template, logo, sections
  - Auto-generate preview after successful scan
- Updated accept route to apply full design:
  - Template mapping from scanner recommendations to WebsiteTemplate types
  - Header config with extracted navigation items
  - Default pages from template
  - Footer config

**Files created:**
- `packages/db/src/repositories/previews.ts`
- `apps/admin/src/app/api/onboarding/design/preview/route.ts`
- `apps/web/src/app/preview/[previewId]/page.tsx`

**Updated:**
- `packages/shared/src/types/scanner.ts` - added PreviewConfig type
- `packages/shared/src/index.ts` - exported TYPOGRAPHY_PRESETS, getDefaultPages
- `packages/db/src/index.ts` - exported previews repository
- `apps/admin/src/app/(dashboard)/dashboard/onboarding/design/page.tsx` - full preview UI
- `apps/admin/src/app/api/onboarding/design/accept/route.ts` - full design application

**Next:** Milestone 6 (Polish and edge cases)

### Milestone 5: Cloudflare API Integration ✅ COMPLETE (2026-01-05)

**Built:**
- `@madebuy/cloudflare` package with:
  - `CloudflareClient` - HTTP client with API token authentication
  - `ZonesApi` - List, get, create zones (domains)
  - `DnsApi` - DNS record CRUD, MadeBuy-specific configuration
  - Full TypeScript types for Cloudflare API responses
- Cloudflare API routes in admin app:
  - `/api/cloudflare/connect` - Connect/disconnect Cloudflare account (stores API token)
  - `/api/cloudflare/zones` - List zones from connected account
  - `/api/cloudflare/dns` - Get DNS status for a domain
  - `/api/cloudflare/configure` - Auto-configure MadeBuy DNS records
- Updated domain settings page with Cloudflare integration:
  - Connect Cloudflare account with API token
  - Select domain from connected zones
  - One-click DNS auto-configuration
  - Visual feedback for connection status
- Added `CloudflareIntegrationConfig` to tenant type for storing credentials

**Files created:**
- `packages/cloudflare/package.json`
- `packages/cloudflare/tsconfig.json`
- `packages/cloudflare/src/index.ts`
- `packages/cloudflare/src/types.ts`
- `packages/cloudflare/src/client.ts`
- `packages/cloudflare/src/zones.ts`
- `packages/cloudflare/src/dns.ts`
- `apps/admin/src/app/api/cloudflare/connect/route.ts`
- `apps/admin/src/app/api/cloudflare/zones/route.ts`
- `apps/admin/src/app/api/cloudflare/dns/route.ts`
- `apps/admin/src/app/api/cloudflare/configure/route.ts`

**Updated:**
- `packages/shared/src/types/tenant.ts` - Added CloudflareIntegrationConfig
- `apps/admin/src/app/(dashboard)/dashboard/settings/domain/page.tsx` - Full Cloudflare integration UI

**Note:** OAuth flow was not implemented (too complex for MVP). Users provide their own API token with Zone:DNS:Edit permissions.

**Next:** Milestone 6 (Polish and edge cases)

---

## Overview

Enable users to connect their domain to MadeBuy and either design fresh or import their existing website design into our framework.

**Two main flows:**
1. **Domain Connection** - New domain purchase OR existing domain setup via Cloudflare
2. **Design Import** - Scan existing site and map to MadeBuy templates

---

## Phase 1: Foundation & Research

### 1.1 Cloudflare API Research ✅ COMPLETED

**Findings:**
- ❌ Registrar API (purchase/transfer) requires **Enterprise plan** - not available to us
- ✅ DNS/Zones API fully available with standard API token
- ✅ Can manage domains already on Cloudflare

**Revised approach:**
- Domain purchase: Redirect users to Cloudflare dashboard (they pay directly)
- Domain search: Use third-party WHOIS API for availability checks
- DNS management: Full API access once domain is on Cloudflare

**APIs we WILL use:**
| API | Purpose | Access |
|-----|---------|--------|
| Zones | Create/manage DNS zones | ✅ Available |
| DNS Records | A, CNAME, TXT record management | ✅ Available |
| SSL/TLS | Certificate provisioning status | ✅ Available |

**APIs we CANNOT use:**
| API | Purpose | Access |
|-----|---------|--------|
| Registrar (purchase) | Buy new domains | ❌ Enterprise only |
| Registrar (transfer) | Transfer domains in | ❌ Enterprise only |

### 1.2 Database Schema Additions

```typescript
// packages/shared/src/types/tenant.ts

interface Tenant {
  // ... existing fields

  // Domain onboarding (NEW)
  domainOnboarding?: {
    status: 'not_started' | 'domain_setup' | 'design_choice' | 'importing' | 'complete'

    // Domain connection
    domain?: string
    domainSource: 'cloudflare_purchase' | 'existing_cloudflare' | 'external_transfer'
    cloudflareAccountConnected: boolean
    cloudflareZoneId?: string
    dnsVerified: boolean
    sslStatus: 'pending' | 'active' | 'error'

    // For external domains awaiting setup
    pendingDnsRecords?: DnsRecord[]
    verificationToken?: string

    // Design import
    designImport?: {
      sourceUrl?: string
      scannedAt?: Date
      extractedDesign?: ExtractedDesign
      importStatus: 'not_started' | 'scanning' | 'preview' | 'accepted' | 'declined'
      limitationsNotice?: string[]
    }
  }
}

interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT'
  name: string
  value: string
  verified: boolean
}

interface ExtractedDesign {
  // Colors
  colors: {
    primary?: string
    accent?: string
    background?: string
    text?: string
    confidence: number // 0-1 how confident we are in extraction
  }

  // Typography
  typography: {
    headingFont?: string
    bodyFont?: string
    googleFontsDetected: string[]
    matchedPreset?: TypographyPreset
    confidence: number
  }

  // Logo
  logo?: {
    sourceUrl: string
    downloadedMediaId?: string // After we save to R2
    altText?: string
  }

  // Navigation
  navigation: {
    items: { label: string; href: string }[]
    structure: 'simple' | 'mega-menu' | 'unknown'
  }

  // Sections detected
  sections: {
    type: PageSectionType | 'unknown'
    confidence: number
    sourceSelector?: string // CSS selector where found
    extractedContent?: Record<string, any>
  }[]

  // Overall assessment
  templateMatch: {
    recommended: WebsiteTemplate
    confidence: number
    reason: string
  }

  // Limitations encountered
  limitations: string[]
}
```

### 1.3 New Package: `@madebuy/cloudflare`

```
packages/
  cloudflare/
    src/
      index.ts
      registrar.ts      # Domain search, purchase
      zones.ts          # Zone management
      dns.ts            # DNS record management
      oauth.ts          # Connect user's CF account
      types.ts
    package.json
```

---

## Phase 2: Domain Connection Flow

### 2.1 UI: Domain Setup Wizard

**Location:** `apps/admin/src/app/(dashboard)/dashboard/onboarding/domain/page.tsx`

```
Step 1: Domain Choice
├── "I need a new domain" → Step 2A
└── "I have a domain" → Step 2B

Step 2A: Purchase New Domain (Redirect to Cloudflare)
├── Search box for domain availability (via WHOIS API)
├── Show results with estimated pricing
├── "Register with Cloudflare" → Opens Cloudflare dashboard in new tab
├── Instructions: "Complete purchase, then return here"
├── User enters purchased domain
├── We verify ownership via DNS
└── → Step 3

Step 2B: Connect Existing Domain
├── Enter domain name
├── Detect if already on Cloudflare
│   ├── Yes → OAuth to connect account, manage DNS
│   └── No → Show setup instructions
├── Display required DNS records
├── Registrar-specific guides (expandable)
│   ├── GoDaddy (major AU market share)
│   ├── Namecheap (popular budget option)
│   ├── Crazy Domains (AU-focused registrar)
│   └── Generic instructions (fallback)
├── "Verify DNS" button (polls for verification)
└── → Step 3

Step 3: DNS Verified
├── SSL provisioning status
├── Domain active confirmation
└── → Design Setup (Phase 3)
```

### 2.2 API Routes

```
apps/admin/src/app/api/onboarding/domain/
├── search/route.ts        # GET - Search available domains
├── purchase/route.ts      # POST - Initiate Cloudflare purchase
├── connect/route.ts       # POST - Connect existing CF account
├── verify/route.ts        # POST - Check DNS verification
├── records/route.ts       # GET - Get required DNS records
└── status/route.ts        # GET - Overall domain status
```

### 2.3 Registrar-Specific Guides

**GoDaddy:**
```
1. Log in to GoDaddy → My Products → DNS
2. Find your domain → Manage DNS
3. Add records:
   - Type: CNAME, Name: www, Value: shops.madebuy.com.au
   - Type: A, Name: @, Value: [MadeBuy IP]
   - Type: TXT, Name: @, Value: madebuy-verify=[token]
4. Save changes (propagation: 24-48 hours)
```

**Namecheap:**
```
1. Log in to Namecheap → Domain List → Manage
2. Advanced DNS tab
3. Add new records:
   - Type: CNAME, Host: www, Value: shops.madebuy.com.au
   - Type: A, Host: @, Value: [MadeBuy IP]
   - Type: TXT, Host: @, Value: madebuy-verify=[token]
4. Save all changes
```

**Crazy Domains:**
```
1. Log in to Crazy Domains → My Domains
2. Click domain → DNS Settings
3. Add records:
   - CNAME: www → shops.madebuy.com.au
   - A Record: @ → [MadeBuy IP]
   - TXT: @ → madebuy-verify=[token]
4. Save (propagation: up to 48 hours)
```

**Generic (fallback):**
```
1. Log in to your domain registrar
2. Find DNS management / DNS settings
3. Add these records:
   [Show table of required records]
4. Save and wait for propagation
5. Return here and click "Verify"
```

### 2.4 DNS Records We'll Require

For `example.com` pointing to MadeBuy:

```
Type    Name    Value                       Purpose
----    ----    -----                       -------
CNAME   @       shops.madebuy.com.au        Root domain
CNAME   www     shops.madebuy.com.au        WWW subdomain
TXT     @       madebuy-verify=<token>      Ownership verification
```

Or if CNAME flattening not available:
```
A       @       <MadeBuy IP>                Root domain
CNAME   www     shops.madebuy.com.au        WWW subdomain
```

---

## Phase 3: Design Setup Flow

### 3.1 UI: Design Choice

**Location:** `apps/admin/src/app/(dashboard)/dashboard/onboarding/design/page.tsx`

```
Design Setup
├── "Start fresh" → Existing website-design page (template selection)
└── "Import my existing website" → Step 3.2

Import Flow:
├── Enter website URL
├── "Scan Website" button
├── Loading state with progress indicators
├── Results screen showing:
│   ├── Extracted colors (with confidence)
│   ├── Detected fonts
│   ├── Logo preview
│   ├── Navigation items found
│   ├── Sections detected
│   ├── Recommended template
│   └── Limitations notice (if any)
├── Live preview of generated site
├── "Accept & Continue" or "Start Fresh Instead"
└── → Website design editor (with imported config pre-filled)
```

### 3.2 Website Scanner Service

**Location:** `packages/cloudflare/src/scanner/` or separate `packages/scanner/`

```typescript
// Scanner architecture

interface ScannerInput {
  url: string
  options?: {
    timeout?: number
    followRedirects?: boolean
    extractImages?: boolean
  }
}

interface ScannerOutput {
  success: boolean
  extractedDesign: ExtractedDesign
  rawData: {
    html: string
    stylesheets: string[]
    computedStyles: Record<string, string>
  }
  errors: string[]
}

class WebsiteScanner {
  // Main entry point
  async scan(input: ScannerInput): Promise<ScannerOutput>

  // Extraction methods
  private extractColors(document: Document, styles: CSSStyleSheet[]): ColorExtraction
  private extractTypography(document: Document, styles: CSSStyleSheet[]): TypographyExtraction
  private extractLogo(document: Document): LogoExtraction
  private extractNavigation(document: Document): NavigationExtraction
  private detectSections(document: Document): SectionDetection[]

  // Mapping to MadeBuy
  private mapToTemplate(extracted: ExtractedDesign): TemplateMapping
  private mapColorsToTheme(colors: ColorExtraction): { primary: string; accent: string }
  private mapFontsToPreset(fonts: TypographyExtraction): TypographyPreset
  private mapSectionsToPages(sections: SectionDetection[]): WebsitePage[]
}
```

### 3.3 Color Extraction Strategy

```typescript
// Priority order for finding primary color:
const colorSources = [
  'meta[name="theme-color"]',           // Theme color meta tag
  'header a, nav a',                     // Navigation link colors
  'button, .btn, [class*="button"]',    // Button colors
  'a:not(nav a)',                        // General link colors
  'h1, h2, h3',                          // Heading colors
]

// Techniques:
// 1. Parse inline styles
// 2. Fetch and parse linked stylesheets
// 3. Use headless browser for computed styles (fallback)
// 4. Analyze favicon/logo dominant colors

// Filter out:
// - Pure black/white (likely text, not brand)
// - Grays (likely neutral, not brand)
// - Colors appearing < 3 times (noise)
```

### 3.4 Typography Extraction Strategy

```typescript
// Detection methods:
// 1. Google Fonts link tags → Most reliable
// 2. @font-face declarations in CSS
// 3. font-family CSS properties on body, headings
// 4. Adobe Fonts (Typekit) detection

// Mapping to presets:
const fontToPreset: Record<string, TypographyPreset> = {
  'Inter': 'modern',
  'Roboto': 'modern',
  'Open Sans': 'modern',
  'Playfair Display': 'elegant',
  'Cormorant': 'elegant',
  'Lora': 'classic',
  'Merriweather': 'classic',
  'Montserrat': 'bold',
  'Oswald': 'bold',
  'Source Sans Pro': 'minimal',
  // ... etc
}

// If no match, default to 'modern' with notice
```

### 3.5 Section Detection Strategy

```typescript
// Pattern matching for common sections:
const sectionPatterns = [
  {
    type: 'hero-simple',
    selectors: ['[class*="hero"]', 'section:first-of-type:has(h1)'],
    indicators: ['large heading', 'CTA button', 'background image']
  },
  {
    type: 'product-grid',
    selectors: ['[class*="product"]', '[class*="shop"]', '.grid:has(img)'],
    indicators: ['multiple images', 'prices', 'add to cart']
  },
  {
    type: 'testimonials',
    selectors: ['[class*="testimonial"]', '[class*="review"]', 'blockquote'],
    indicators: ['quotes', 'attribution', 'rating stars']
  },
  {
    type: 'about',
    selectors: ['[class*="about"]', '#about', 'section:has(h2:contains("About"))'],
    indicators: ['paragraph text', 'team photos', 'story content']
  },
  {
    type: 'contact',
    selectors: ['[class*="contact"]', 'form', 'footer'],
    indicators: ['email', 'phone', 'address', 'form fields']
  },
  // ... more patterns
]

// Confidence scoring:
// - Exact class match: 0.9
// - Semantic HTML match: 0.7
// - Content-based match: 0.5
// - No match: return 'unknown'
```

### 3.6 Logo Extraction Strategy

```typescript
// Priority order:
const logoSources = [
  'header img[class*="logo"]',
  'header a > img',
  'header svg',
  '[class*="logo"] img',
  'link[rel="icon"][sizes="192x192"]',  // Large favicon
  'meta[property="og:image"]',           // OG image as fallback
]

// Process:
// 1. Find logo element
// 2. Get src URL (handle relative paths)
// 3. Download image
// 4. Upload to R2
// 5. Store mediaId reference
```

### 3.7 API Routes

```
apps/admin/src/app/api/onboarding/design/
├── scan/route.ts          # POST - Initiate website scan
├── scan/status/route.ts   # GET - Check scan progress
├── preview/route.ts       # POST - Generate preview with extracted design
├── accept/route.ts        # POST - Accept imported design
└── decline/route.ts       # POST - Decline, go to fresh design
```

---

## Phase 4: Preview System

### 4.1 Preview Architecture

```typescript
// Preview generates a temporary tenant config for display

interface PreviewConfig {
  tenantId: string
  previewId: string // Unique preview session
  design: TenantWebsiteDesign
  expiresAt: Date // 24 hour expiry
}

// Store in Redis or MongoDB with TTL
```

### 4.2 Preview UI Component

**Location:** `apps/admin/src/components/onboarding/DesignPreview.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Preview: Your Imported Design                    [Desktop] │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │   [Live iframe preview of generated storefront]        │ │
│  │                                                        │ │
│  │   Shows: header, hero, sections, footer                │ │
│  │   With: extracted colors, fonts, logo                  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Device: [Desktop] [Tablet] [Mobile]                        │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │  ✓ Accept Design    │  │  Start Fresh        │          │
│  │                     │  │                     │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  ⚠️ Limitations:                                            │
│  • Could not detect all sections - using defaults           │
│  • Logo was low resolution - consider uploading new one     │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Preview Route

```
apps/web/src/app/preview/[previewId]/page.tsx

- Loads preview config by previewId
- Renders storefront with preview design
- No database writes, purely display
- Accessible only with valid previewId
```

---

## Phase 5: Implementation Milestones

### Milestone 1: Domain Connection (Existing Domains)
**Scope:** Connect domains already on Cloudflare or via manual DNS

- [ ] Database schema updates
- [ ] DNS verification service
- [ ] Domain setup wizard UI (external domains flow)
- [ ] Registrar-specific instruction pages
- [ ] Status polling and verification

**No Cloudflare API integration yet - manual DNS setup only**

### Milestone 2: Website Scanner (Basic)
**Scope:** Extract colors, fonts, logo

- [ ] Scanner package foundation
- [ ] Color extraction (CSS parsing)
- [ ] Typography extraction (Google Fonts detection)
- [ ] Logo extraction and R2 upload
- [ ] Basic preview generation

### Milestone 3: Website Scanner (Full)
**Scope:** Navigation and section detection

- [ ] Navigation extraction
- [ ] Section pattern matching
- [ ] Template recommendation engine
- [ ] Confidence scoring
- [ ] Limitations detection and messaging

### Milestone 4: Preview System
**Scope:** Full preview before accepting

- [ ] Preview config storage
- [ ] Preview route in web app
- [ ] Accept/decline flow
- [ ] Pre-fill website design editor

### Milestone 5: Cloudflare API Integration ✅ COMPLETE
**Scope:** Automated domain management

- [x] Research Cloudflare partner requirements
- [x] Cloudflare package implementation
- [x] ~~OAuth flow for user accounts~~ (Skipped - using API token instead)
- [x] Zone and DNS automation
- [ ] ~~Domain search/purchase flow~~ (Not available - Enterprise only)

### Milestone 6: Polish & Edge Cases
**Scope:** Handle failures gracefully

- [ ] JavaScript-rendered site handling (Puppeteer fallback)
- [ ] Rate limiting on scans
- [ ] Error recovery flows
- [ ] Analytics on import success rates
- [ ] User feedback on extraction quality

---

## Technical Decisions

### Scanner Runtime Options

| Option | Pros | Cons |
|--------|------|------|
| **Server-side fetch + Cheerio** | Fast, no browser needed | Can't handle JS-rendered sites |
| **Puppeteer/Playwright** | Full JS execution, accurate styles | Heavy, slow, requires headless browser |
| **Cloudflare Workers + HTMLRewriter** | Edge execution, fast | Limited JS handling |
| **Hybrid approach** | Best of both | More complex |

**Recommendation:** Start with Cheerio for initial extraction. Add Puppeteer fallback for sites where Cheerio returns insufficient data.

### Preview Storage

| Option | Pros | Cons |
|--------|------|------|
| **MongoDB with TTL** | Already using, simple | Another collection |
| **Redis** | Built for ephemeral data | Another service |
| **In-memory** | Simplest | Lost on restart |

**Recommendation:** MongoDB with TTL index (24 hour expiry). Add `previews` collection.

### Cloudflare Integration Approach

| Option | Pros | Cons |
|--------|------|------|
| **Full API integration** | Seamless UX | Complex, may need partner status |
| **OAuth + limited API** | User controls their account | Still need API access |
| **Manual instructions only** | No API dependency | More user friction |
| **Hybrid** | Flexibility | Two codepaths |

**Recommendation:** Start with manual instructions (Milestone 1). Add API integration in Milestone 5 after research confirms access.

---

## UI/UX Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Do you have a domain? │
              └─────────────────────────┘
                    │             │
            ┌───────┘             └───────┐
            ▼                             ▼
    ┌───────────────┐           ┌───────────────────┐
    │ Need a domain │           │ I have a domain   │
    └───────────────┘           └───────────────────┘
            │                             │
            ▼                             ▼
    ┌───────────────┐           ┌───────────────────┐
    │ Search domain │           │ Enter your domain │
    │ (Cloudflare)  │           └───────────────────┘
    └───────────────┘                     │
            │                             ▼
            ▼                   ┌───────────────────┐
    ┌───────────────┐           │ Is it on          │
    │ Purchase via  │           │ Cloudflare?       │
    │ Cloudflare    │           └───────────────────┘
    └───────────────┘               │           │
            │               ┌───────┘           └───────┐
            │               ▼                           ▼
            │       ┌───────────────┐         ┌───────────────┐
            │       │ Connect OAuth │         │ Show DNS      │
            │       │ (auto-config) │         │ instructions  │
            │       └───────────────┘         └───────────────┘
            │               │                           │
            └───────────────┼───────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Domain Verified ✓     │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Design your website    │
              └─────────────────────────┘
                    │             │
            ┌───────┘             └───────┐
            ▼                             ▼
    ┌───────────────┐           ┌───────────────────┐
    │ Start Fresh   │           │ Import Existing   │
    │ (templates)   │           │ Website Design    │
    └───────────────┘           └───────────────────┘
            │                             │
            │                             ▼
            │                   ┌───────────────────┐
            │                   │ Enter website URL │
            │                   └───────────────────┘
            │                             │
            │                             ▼
            │                   ┌───────────────────┐
            │                   │ Scanning...       │
            │                   │ • Colors          │
            │                   │ • Fonts           │
            │                   │ • Logo            │
            │                   │ • Sections        │
            │                   └───────────────────┘
            │                             │
            │                             ▼
            │                   ┌───────────────────┐
            │                   │ Preview Results   │
            │                   │ + Limitations     │
            │                   └───────────────────┘
            │                       │         │
            │               ┌───────┘         └───────┐
            │               ▼                         ▼
            │       ┌───────────────┐         ┌───────────────┐
            │       │ Accept        │         │ Decline       │
            │       └───────────────┘         │ (Start Fresh) │
            │               │                 └───────────────┘
            │               │                         │
            └───────────────┼─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Website Design Editor  │
              │  (pre-filled if import) │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Onboarding Complete ✓  │
              └─────────────────────────┘
```

---

## Files to Create/Modify

### New Files

```
packages/
  cloudflare/                           # NEW PACKAGE
    src/
      index.ts
      dns.ts
      zones.ts
      registrar.ts
      oauth.ts
      types.ts
    package.json

  scanner/                              # NEW PACKAGE (or inside cloudflare)
    src/
      index.ts
      scanner.ts
      extractors/
        colors.ts
        typography.ts
        logo.ts
        navigation.ts
        sections.ts
      mappers/
        template-mapper.ts
        font-mapper.ts
        section-mapper.ts
      types.ts
    package.json

apps/admin/src/
  app/(dashboard)/dashboard/
    onboarding/                         # New user signup flow
      page.tsx                          # Onboarding hub
      domain/
        page.tsx                        # Domain setup wizard
      design/
        page.tsx                        # Design import wizard
    settings/
      domain/
        page.tsx                        # Domain settings (existing users)

  app/api/onboarding/
    domain/
      search/route.ts
      verify/route.ts
      records/route.ts
      status/route.ts
    design/
      scan/route.ts
      preview/route.ts
      accept/route.ts

  components/onboarding/
    DomainWizard.tsx
    DnsInstructions.tsx
    RegistrarGuide.tsx
    DesignScanner.tsx
    DesignPreview.tsx
    ExtractionResults.tsx
    LimitationsNotice.tsx

apps/web/src/
  app/preview/
    [previewId]/
      page.tsx                          # Preview renderer
```

### Modified Files

```
packages/shared/src/types/
  tenant.ts                             # Add domainOnboarding fields
  index.ts                              # Export new types

packages/db/src/repositories/
  tenants.ts                            # Add onboarding update methods
  previews.ts                           # NEW - preview storage
  index.ts                              # Export previews

apps/admin/src/
  components/dashboard/Sidebar.tsx      # Add Onboarding nav item
```

---

## Estimated Effort

| Milestone | Complexity | Notes |
|-----------|------------|-------|
| 1. Domain Connection | Medium | UI-heavy, DNS verification logic |
| 2. Scanner Basic | Medium | CSS parsing, extraction algorithms |
| 3. Scanner Full | High | Section detection is complex |
| 4. Preview System | Low | Mostly existing storefront code |
| 5. Cloudflare API | Medium-High | Depends on API access |
| 6. Polish | Medium | Edge cases, error handling |

**Suggested order:** 1 → 2 → 4 → 3 → 5 → 6

Start with domain connection (immediate value) and basic scanner (colors/fonts/logo). Get preview working early so users can see results. Add full section detection later. Cloudflare API integration can be parallel or deferred.

---

## Open Questions

1. ~~**Cloudflare Partner Status**~~ ✅ Resolved - Enterprise only for Registrar API, using redirect approach
2. **Scanner Hosting** - Run in API route or separate service? Puppeteer needs resources
3. **Rate Limiting** - How many scans per tenant per day?
4. **Analytics** - Track import success rates to improve patterns?
5. ~~**Existing Users**~~ ✅ Resolved - Part of new signup AND accessible via Settings

---

## Access Points

### New User Signup Flow
Onboarding wizard is part of initial tenant setup:
```
Signup → Account Details → Domain Setup → Design Setup → Dashboard
```

### Existing User Access
Available in admin settings for users who:
- Skipped domain setup initially
- Want to change their domain
- Want to re-import/change design

**Location:** Settings → Domain & Website
```
apps/admin/src/app/(dashboard)/dashboard/settings/domain/page.tsx
```

### Navigation
- **During signup:** Full wizard flow, mandatory steps
- **In settings:** Individual sections, can modify independently
  - Domain settings (change/verify domain)
  - Design import (re-scan existing site)
  - Both link to main website-design editor
