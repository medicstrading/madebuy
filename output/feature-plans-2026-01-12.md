# MadeBuy Feature Implementation Plans

**Generated:** 2026-01-12
**Features:** Digital Downloads, CSV Import, Order Personalization, GST Summary

---

## Feature 1: Digital Downloads for Makers

### Overview
Enable makers to sell digital products (patterns, templates, SVGs, printables) with instant delivery after purchase.

### Business Value
- **High margin:** Zero shipping, zero inventory holding cost
- **Passive income:** Sell unlimited times from single upload
- **Market demand:** PDF patterns, SVG files, Lightroom presets are top sellers on Etsy
- **Competitive parity:** Etsy, Shopify, Gumroad all support this

### Competitor Analysis
| Platform | File Limit | Size Limit | Delivery |
|----------|-----------|------------|----------|
| Etsy | 5 files | 20MB each | Email + account |
| Shopify | Unlimited | 5GB | Email + checkout page |
| Gumroad | Unlimited | 16GB | Email + account + streaming |
| Big Cartel | Via Pulley app | 1GB | Third-party |

### Implementation Phases

#### Phase 1: Core MVP (Sonnet tier)
**Scope:** Simple digital products, single file uploads, instant delivery

**Database Changes:**
```typescript
// packages/shared/src/types/piece.ts
interface Piece {
  // ... existing fields

  // Digital product fields
  isDigital?: boolean
  digitalFiles?: DigitalFile[]
  deliverySettings?: DigitalDeliverySettings
}

interface DigitalFile {
  id: string
  name: string           // Original filename
  size: number           // Bytes
  format: string         // pdf, svg, png, zip
  r2Key: string          // Cloudflare R2 storage key
  thumbnailUrl?: string  // Preview image
  uploadedAt: Date
}

interface DigitalDeliverySettings {
  expiryDays: number       // Default 7
  maxDownloads: number     // Default 5
  sendEmail: boolean       // Default true
  watermarkEnabled: boolean // Default false (Pro feature)
}

// packages/shared/src/types/order.ts
interface OrderItem {
  // ... existing fields

  // Digital download tracking
  digitalDownloads?: DigitalDownloadRecord[]
}

interface DigitalDownloadRecord {
  fileId: string
  downloadUrl: string      // Signed R2 URL
  expiresAt: Date
  downloadsRemaining: number
  downloadedAt?: Date[]    // Track each download
}
```

**New Repository:** `packages/db/src/repositories/digitalDownloads.ts`
```typescript
// Track download attempts
createDownloadRecord(orderId: string, itemId: string, fileId: string): Promise<DigitalDownloadRecord>
recordDownloadAttempt(recordId: string, ip: string): Promise<boolean>
getDownloadsForOrder(orderId: string): Promise<DigitalDownloadRecord[]>
checkDownloadLimit(recordId: string): Promise<{allowed: boolean, remaining: number}>
```

**API Endpoints:**
```
POST /api/pieces/[id]/digital-files     Upload digital file
DELETE /api/pieces/[id]/digital-files/[fileId]  Remove file
GET /api/orders/[id]/downloads          Get download links for order
GET /api/downloads/[token]              Generate signed download URL
POST /api/downloads/[token]/download    Record download attempt, return file
```

**Admin UI Changes:**
- Piece edit form: "This is a digital product" toggle
- File upload area (drag/drop, accepts PDF/SVG/PNG/JPG/ZIP)
- File list with name, size, format badge, delete button
- Delivery settings: expiry days, max downloads

**Storefront Changes:**
- Product card: "Instant Download" badge
- Product detail: "What's Included" file list
- Checkout success: Download button(s)
- Customer account: "My Downloads" section

**Email Changes:**
- Order confirmation: Include download links
- Download reminder: "Your download expires in 24 hours"

**Files to Modify:**
- `packages/shared/src/types/piece.ts` - Add digital fields
- `packages/shared/src/types/order.ts` - Add download tracking
- `packages/db/src/repositories/pieces.ts` - Handle digital files
- `packages/db/src/repositories/orders.ts` - Create download records on purchase
- `apps/admin/src/app/api/pieces/[id]/digital-files/route.ts` - New
- `apps/admin/src/components/inventory/PieceForm.tsx` - Add digital section
- `apps/web/src/app/[tenant]/product/[slug]/page.tsx` - Show file list
- `apps/web/src/app/[tenant]/checkout/success/page.tsx` - Download buttons
- `apps/web/src/app/api/downloads/[token]/route.ts` - New

**Effort:** ~3-4 days

#### Phase 2: Security & Polish (Sonnet tier)
- Signed R2 URLs with expiration
- IP logging for downloads
- Download attempt limiting
- File type validation & virus scanning
- Thumbnail generation for images/PDFs

#### Phase 3: Premium Features (Pro tier only)
- PDF watermarking with buyer email
- Streaming-only delivery for videos
- License key generation
- Bundle digital + physical products

### Acceptance Criteria
- [ ] Maker can mark product as digital
- [ ] Maker can upload up to 5 files (50MB each)
- [ ] Buyer receives download link on checkout success page
- [ ] Buyer receives download link in order confirmation email
- [ ] Download links expire after 7 days / 5 attempts
- [ ] Customer account shows "My Downloads" with re-download option
- [ ] Product card shows "Instant Download" badge
- [ ] Product page shows "What's Included" file list

---

## Feature 2: Inventory CSV Import

### Overview
Allow makers to bulk import products via CSV upload, enabling migration from Etsy, Shopify, and other platforms.

### Business Value
- **Reduces migration friction:** Key barrier to switching platforms
- **Time saver:** Bulk upload vs manual entry
- **Competitive necessity:** All major platforms support this

### Competitor Formats Analyzed
- **Shopify:** Handle, Title, Body, Vendor, Type, Tags, Variants, Images
- **Etsy:** Title, Description, Tags, Quantity (export only, no import)
- **WooCommerce:** SKU, Name, Description, Price, Stock, Categories

### Implementation Phases

#### Phase 1: Simple Import MVP (Sonnet tier)
**Scope:** Single products (no variants), create new only

**CSV Schema (MadeBuy format):**
```csv
handle,name,description,price,stock,category,tags,status,imageSrc,imagePosition
handmade-mug,Ceramic Mug,Handmade ceramic coffee mug,29.99,10,Ceramics,"handmade,ceramic,mug",available,https://cdn.example.com/mug1.jpg,1
handmade-mug,,,,,,,https://cdn.example.com/mug2.jpg,2
```

**Required columns:** `handle`, `name`
**Optional:** All others

**Database Schema:**
```typescript
// packages/shared/src/types/import.ts
interface ImportJob {
  id: string
  tenantId: string
  status: 'uploaded' | 'validating' | 'validated' | 'processing' | 'completed' | 'failed'
  filename: string
  fileSize: number
  rowCount: number

  // Validation results
  validatedAt?: Date
  preview?: ImportPreview
  errors?: ImportError[]
  warnings?: ImportWarning[]

  // Processing results
  startedAt?: Date
  completedAt?: Date
  productsCreated: number
  productsUpdated: number
  imagesDownloaded: number

  createdAt: Date
  updatedAt: Date
}

interface ImportPreview {
  totalRows: number
  productsDetected: number
  variantsDetected: number
  imagesDetected: number
  sampleRows: ParsedRow[]  // First 5 rows
}

interface ImportError {
  row: number
  column?: string
  message: string
  value?: string
}

interface ImportWarning {
  row: number
  message: string
}
```

**API Endpoints:**
```
POST /api/import/upload           Upload CSV, create job
GET  /api/import/[jobId]          Get job status
POST /api/import/[jobId]/validate Run validation
GET  /api/import/[jobId]/preview  Get preview data
POST /api/import/[jobId]/confirm  Start import
GET  /api/import/[jobId]/errors   Download error CSV
GET  /api/import/templates        Download blank template
GET  /api/import/templates/etsy   Download Etsy migration template
GET  /api/import/templates/shopify Download Shopify migration template
```

**Admin UI:**
- Settings > Import Products page
- Step 1: Upload CSV (drag/drop)
- Step 2: Validate & preview (show errors, warnings, sample data)
- Step 3: Confirm import (background job)
- Step 4: Results (success count, error log, link to products)

**Processing Flow:**
1. Upload → Save to temp R2 storage, create ImportJob
2. Validate → Parse CSV, check schema, validate data types
3. Preview → Group rows by handle, count products/variants/images
4. Confirm → Queue background job (BullMQ or simple cron)
5. Process → Create products, download images, create media records
6. Complete → Update job with results, email notification

**Image Handling:**
- Validate URLs (HEAD request, check content-type)
- Download images (5 concurrent)
- Create MediaItem records
- Link to piece via `mediaIds`

**Error Handling:**
- Validate entire file first (don't stop on first error)
- Log all errors with row numbers
- Allow partial import (skip error rows)
- Generate downloadable error report

**Files to Create:**
- `packages/shared/src/types/import.ts` - Types
- `packages/db/src/repositories/imports.ts` - Repository
- `apps/admin/src/app/api/import/route.ts` - Upload endpoint
- `apps/admin/src/app/api/import/[jobId]/route.ts` - Job operations
- `apps/admin/src/app/(dashboard)/settings/import/page.tsx` - UI
- `apps/admin/src/components/import/ImportWizard.tsx` - Multi-step flow
- `apps/admin/src/lib/csv-parser.ts` - CSV parsing & validation

**Effort:** ~4-5 days

#### Phase 2: Variants & Updates (Sonnet tier)
- Multi-row variant support (Shopify format)
- Update existing products (match by handle/SKU)
- Merge strategies: "Update all" vs "Only empty fields"

#### Phase 3: Platform Templates (Haiku tier)
- Pre-built Etsy export transformer
- Pre-built Shopify export transformer
- Auto-detect platform from CSV structure

### Acceptance Criteria
- [ ] Maker can upload CSV file (drag/drop or file picker)
- [ ] System validates CSV and shows errors before import
- [ ] Preview shows sample data and import summary
- [ ] Import runs in background for large files
- [ ] Results page shows success/failure counts
- [ ] Error log downloadable as CSV
- [ ] Blank template available for download
- [ ] Images downloaded from URLs and linked to products

---

## Feature 3: Order Personalization

### Overview
Allow makers to add customization fields to products (engraving text, gift messages, custom sizing) that customers fill out at purchase.

### Business Value
- **Higher margins:** Personalized items command premium prices
- **Differentiation:** Key feature for handmade makers
- **Already partially built:** `PersonalizationConfig` type exists!

### Current State Analysis
MadeBuy already has types defined:
- `PersonalizationConfig` on `Piece`
- `PersonalizationField` with text, textarea, select, checkbox, file, date, number
- `PersonalizationValue` on `OrderItem`

**What's missing:**
- Admin UI to configure personalization fields
- Storefront UI to collect customer input
- Order detail display of personalization
- Packing slip integration

### Implementation Phases

#### Phase 1: Admin Configuration UI (Sonnet tier)
**Scope:** Let makers define personalization fields on products

**Admin UI - Piece Edit Form:**
```
[x] Enable personalization for this product

PERSONALIZATION FIELDS
┌─────────────────────────────────────────────────────────────┐
│ Field 1: Engraving Text                              [Edit] │
│ Type: Text | Required: Yes | Max: 20 chars | +$10         │
├─────────────────────────────────────────────────────────────┤
│ Field 2: Gift Message                                [Edit] │
│ Type: Textarea | Required: No | Max: 250 chars | Free     │
├─────────────────────────────────────────────────────────────┤
│ [+ Add Field]                                               │
└─────────────────────────────────────────────────────────────┘

Processing time: [ 3 ] additional days for personalized orders
Instructions for customers: [___________________]
```

**Field Configuration Modal:**
- Field name/label
- Field type dropdown
- Required toggle
- Character limits (for text/textarea)
- Options (for select/checkbox)
- Price adjustment (fixed $ or %)
- Help text
- Placeholder

**Files to Modify:**
- `apps/admin/src/components/inventory/PieceForm.tsx` - Add personalization section
- `apps/admin/src/components/inventory/PersonalizationFieldEditor.tsx` - New component

**Effort:** ~1-2 days

#### Phase 2: Storefront Collection (Sonnet tier)
**Scope:** Show personalization fields to customers, collect input

**Product Page Changes:**
```
ADD TO CART

Engraving Text *
┌────────────────────────────────────────┐
│ SARAH                                  │ 15/20 characters
└────────────────────────────────────────┘
We engrave exactly what you type. 20 characters max.

Gift Message (optional)
┌────────────────────────────────────────┐
│ Happy Birthday! Hope you love it.     │
│                                        │
└────────────────────────────────────────┘

Personalization: +$10.00
─────────────────────────────────
Total: $49.99

[ADD TO CART]
```

**Cart Display:**
- Show personalization values under item
- Show personalization price adjustment
- Allow editing personalization

**Checkout:**
- Validate required fields before checkout
- Include personalization in order total

**Files to Modify:**
- `apps/web/src/app/[tenant]/product/[slug]/page.tsx` - Add fields
- `apps/web/src/components/product/PersonalizationFields.tsx` - New
- `apps/web/src/app/[tenant]/cart/page.tsx` - Show values
- `apps/web/src/hooks/useCart.ts` - Store personalization

**Effort:** ~2-3 days

#### Phase 3: Order Display & Packing Slips (Haiku tier)
**Scope:** Show personalization to seller, print on packing slips

**Admin Order Detail:**
```
ORDER ITEMS
┌─────────────────────────────────────────────────────────────┐
│ Handmade Ring × 1                                    $39.99 │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ PERSONALIZATION                                         ││
│ │ Engraving: "SARAH"                           +$10.00   ││
│ │ Gift Message: "Happy Birthday! Hope you..."            ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Packing Slip Template:**
- Large, clear personalization section
- All fields with labels
- Easy for workshop/production

**Email Notification:**
- Highlight personalized orders
- Include all personalization values

**Files to Modify:**
- `apps/admin/src/components/orders/OrderDetail.tsx` - Show personalization
- `apps/admin/src/components/orders/PackingSlip.tsx` - Add section
- Order notification email template

**Effort:** ~1 day

### Acceptance Criteria
- [ ] Maker can add personalization fields to products
- [ ] Maker can set field type, required, character limits, price
- [ ] Customer sees personalization fields on product page
- [ ] Customer input validated (required fields, limits)
- [ ] Personalization shows in cart with price adjustment
- [ ] Order detail shows all personalization values
- [ ] Packing slip includes personalization section
- [ ] Order email to seller highlights personalization

---

## Feature 4: Quarterly GST Summary for Australian Makers

### Overview
Provide Australian makers with quarterly GST reports to simplify BAS (Business Activity Statement) preparation.

### Business Value
- **Reduces compliance burden:** Most makers use spreadsheets or accountants
- **Unique differentiator:** Etsy doesn't help with tax compliance
- **Builds trust:** Shows platform understands Australian business needs
- **Retention:** Makers rely on the reports, less likely to churn

### Australian GST Context
- **Registration threshold:** $75,000 annual turnover
- **Rate:** 10% GST on most goods
- **BAS Due Dates:** Quarterly (Oct 28, Feb 28, Apr 28, Jul 28)
- **Key fields:** G1 (Total Sales), 1A (GST Collected), 1B (GST on Purchases)

### Implementation Phases

#### Phase 1: Basic GST Reports (Sonnet tier)
**Scope:** Quarterly sales report with GST breakdown

**Tenant Settings Addition:**
```typescript
// packages/shared/src/types/tenant.ts
interface TenantTaxSettings {
  // ... existing fields
  gstRegistered: boolean
  abn?: string
  gstIncludedInPrices: boolean  // true = prices include GST, false = GST added at checkout
}
```

**New Report: Quarterly GST Summary**
```
QUARTERLY GST SUMMARY
Period: October - December 2025 (Q2 FY2025-26)
BAS Due: 28 February 2026

┌─────────────────────────────────────────────────────────────┐
│ SALES                                                       │
├─────────────────────────────────────────────────────────────┤
│ Total Sales (G1)                              $12,450.00    │
│   GST-inclusive sales                         $11,200.00    │
│   GST-free sales (exports)                     $1,250.00    │
├─────────────────────────────────────────────────────────────┤
│ GST COLLECTED (1A)                             $1,018.18    │
│   (GST component of $11,200.00 taxable sales)               │
└─────────────────────────────────────────────────────────────┘

Note: This report covers sales through MadeBuy only.
Include purchases (1B) from your accounting records.

[Download CSV] [Download PDF]
```

**API Endpoint:**
```
GET /api/reports/gst?quarter=2025-Q4
GET /api/reports/gst?start=2025-10-01&end=2025-12-31
```

**Report Calculation:**
```typescript
interface GSTReport {
  period: {
    quarter: string      // "2025-Q4"
    start: Date
    end: Date
    basDueDate: Date
  }

  sales: {
    totalSales: number           // G1 - all sales
    gstInclusiveSales: number    // Taxable sales
    gstFreeSales: number         // Exports, GST-free items
    exportSales: number          // G2 - exports specifically
  }

  gst: {
    gstCollected: number         // 1A - GST on sales
    // Note: 1B (GST on purchases) requires external data
  }

  breakdown: {
    byMonth: MonthlyBreakdown[]
    byCategory: CategoryBreakdown[]
  }
}
```

**Admin UI:**
- Reports > GST Summary page
- Quarter selector (dropdown)
- Summary cards: Total Sales, GST Collected
- Monthly breakdown chart
- Download buttons (CSV, PDF)

**Files to Create:**
- `apps/admin/src/app/api/reports/gst/route.ts` - Report endpoint
- `apps/admin/src/app/(dashboard)/reports/gst/page.tsx` - UI
- `apps/admin/src/components/reports/GSTSummary.tsx` - Report display
- `packages/db/src/repositories/reports.ts` - Query functions

**Effort:** ~2-3 days

#### Phase 2: Threshold Monitoring (Haiku tier)
**Scope:** Alert makers approaching GST registration threshold

**Dashboard Widget:**
```
GST REGISTRATION TRACKER
─────────────────────────
Rolling 12-month turnover: $68,450
GST threshold: $75,000
                         ████████████░░░░ 91%

⚠️ At current pace, you'll exceed the threshold
   in approximately 2 months.

[Learn about GST registration →]
```

**Alert Triggers:**
- 80% of threshold → Email notification
- 90% of threshold → Dashboard warning
- 100% exceeded → Urgent action required

**Files to Modify:**
- `apps/admin/src/components/dashboard/DashboardPage.tsx` - Add widget
- `apps/admin/src/app/api/analytics/gst-threshold/route.ts` - New
- Email notification template

**Effort:** ~1 day

#### Phase 3: Materials GST Tracking (Sonnet tier)
**Scope:** Track GST paid on materials for input tax credits

**Materials Enhancement:**
```typescript
interface Material {
  // ... existing fields
  gstIncluded: boolean        // Was GST included in purchase price?
  gstAmount?: number          // Calculated GST component
}
```

**Quarterly Report Addition:**
```
┌─────────────────────────────────────────────────────────────┐
│ INPUT TAX CREDITS (from MadeBuy materials)                  │
├─────────────────────────────────────────────────────────────┤
│ Materials purchased (GST-inclusive)           $2,340.00     │
│ GST paid on materials (1B contribution)         $212.73     │
└─────────────────────────────────────────────────────────────┘

Note: This only includes materials tracked in MadeBuy.
Add other business expenses from your records.
```

**Files to Modify:**
- `packages/shared/src/types/material.ts` - Add GST fields
- `packages/db/src/repositories/materials.ts` - GST calculations
- GST report to include materials section

**Effort:** ~1-2 days

#### Phase 4: Accounting Export (Future)
- Xero-compatible export format
- MYOB-compatible export format
- Chart of accounts mapping

### Acceptance Criteria
- [ ] Maker can mark account as GST registered
- [ ] Maker can enter ABN in settings
- [ ] Quarterly GST report shows total sales (G1)
- [ ] Report calculates GST collected (1A)
- [ ] Report shows breakdown by month
- [ ] CSV export available for BAS preparation
- [ ] PDF export available for records
- [ ] Dashboard shows GST threshold progress (if not registered)
- [ ] Alert when approaching $75,000 threshold

---

## Summary: Effort & Priority

| Feature | Effort | Priority | Model Tier |
|---------|--------|----------|------------|
| Digital Downloads MVP | 3-4 days | High | Sonnet |
| CSV Import MVP | 4-5 days | High | Sonnet |
| Order Personalization | 4-5 days | Medium | Sonnet |
| GST Summary | 3-4 days | Medium | Sonnet |

**Recommended order:**
1. **Order Personalization** - Types already exist, quickest win
2. **CSV Import** - Reduces migration friction, enables growth
3. **Digital Downloads** - New revenue stream for makers
4. **GST Summary** - Important for AU compliance, but not blocking

**Total estimated effort:** 15-18 days for all four features

---

## Technical Notes

### Shared Dependencies
- All features use existing `@madebuy/db` repository pattern
- All features integrate with existing tenant/piece/order models
- R2 storage already available for file uploads

### Testing Requirements
- Unit tests for CSV parsing, GST calculations
- Integration tests for file upload flows
- E2E tests for complete purchase with personalization/digital download

### Security Considerations
- Signed URLs for digital downloads (prevent link sharing)
- File type validation (prevent malicious uploads)
- Input sanitization for personalization text
