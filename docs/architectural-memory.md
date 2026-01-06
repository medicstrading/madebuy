# Architectural Memory

This document captures key decisions and patterns for long-term reference.

## Decisions Log

| Date | Decision | Rationale | Files Affected |
|------|----------|-----------|----------------|
| 2025-12 | Sendle for shipping integration | Australian-focused carrier, developer-friendly API, handles tracking emails | packages/shared/src/lib/sendle.ts, apps/admin/src/app/api/shipping/* |
| 2025-12 | Cloudflare R2 for PDF caching | Cost-effective object storage, integrates with existing Cloudflare setup | apps/admin/src/app/api/statements/[id]/route.ts |
| 2025-12 | GST tracking in transactions | Australian tax compliance requirement, quarterly BAS reporting | packages/db/src/repositories/transactions.ts, apps/admin/src/app/api/reports/gst/* |
| 2025-12 | MongoDB aggregation for ledgers | Complex financial queries, date grouping, running balances | packages/db/src/repositories/transactions.ts |
| 2025-12 | Feature tracking with MCP | Autonomous development workflow, 294 tracked features | .beads/features.db |

## Patterns

### Backend Patterns

**Transaction Ledger Pattern**
- MongoDB aggregation pipeline for financial reporting
- Supports date filtering, pagination, CSV export
- Running balance calculation using $accumulator
- Location: `packages/db/src/repositories/transactions.ts`

**PDF Generation with Caching**
- Generate PDF with @react-pdf/renderer
- Cache in Cloudflare R2 (30-day TTL)
- Return cached version if available
- Pattern: Generate → Upload → Return signed URL
- Location: `apps/admin/src/app/api/statements/[id]/route.ts`

**Webhook Processing**
- Verify signature (Stripe, Sendle)
- Idempotent processing (check event ID)
- Update database atomically
- Send notifications/emails
- Location: `apps/web/src/app/api/webhooks/*`

### Frontend Patterns

**Date Range Filtering**
- shadcn Popover + Calendar components
- Query params for shareable URLs
- Debounced updates to prevent excessive API calls
- Location: `apps/admin/src/components/filters/DateRangeFilter.tsx`

**CSV Export**
- Client-side generation using papaparse
- Trigger download via blob URL
- Format currency, dates for Excel compatibility
- Location: `apps/admin/src/components/exports/TransactionExport.tsx`

**Modal Viewers**
- PDF.js for in-browser PDF viewing
- Iframe fallback for compatibility
- Download option always available
- Location: `apps/admin/src/components/modals/PdfViewer.tsx`

### Integration Patterns

**Sendle Shipping**
- Quote: POST /orders/quote with package dimensions
- Book: POST /orders with pickup details
- Tracking: Webhook updates order status
- Email: Automatic tracking emails via Sendle
- Auth: API key in Authorization header
- Location: `packages/shared/src/lib/sendle.ts`

**Stripe Connect**
- OAuth flow for vendor onboarding
- Connected account for vendor payouts
- Application fees for platform revenue
- Webhook for account updates
- Location: `apps/web/src/app/api/stripe-connect/*`

**Cloudflare R2**
- S3-compatible API using @aws-sdk/client-s3
- Presigned URLs for secure downloads (1-hour expiry)
- Public bucket with private objects
- Environment: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
- Location: `packages/shared/src/lib/r2.ts`

## Known Issues / Tech Debt

- [ ] PDF generation memory usage - consider queue for large batches
- [ ] Transaction aggregation performance - add indexes for date + tenant
- [ ] Sendle webhook signature verification - not yet implemented
- [ ] GST report edge cases - handle partial months for mid-year starts
- [ ] Shipping dimensions validation - ensure physical constraints met
