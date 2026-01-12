# E2E Testing Strategy for MadeBuy

## Overview

End-to-end tests verify complete user workflows across the MadeBuy platform using Playwright. Tests run in headless browser and validate UI interactions, data flows, and critical business paths.

**Framework:** Playwright
**Languages:** TypeScript
**Test Locations:**
- Admin app: `apps/admin/e2e/`
- Web app: `apps/web/e2e/`

## Test Suites by Feature Area

### Admin Dashboard (Seller App)

#### Authentication (`admin/e2e/auth.spec.ts`)
- [x] Login page displays form elements
- [x] Form validation (empty submission)
- [x] Invalid credentials error handling
- [x] Unauthenticated redirect to login
- [x] Successful login flow
- [x] Logout functionality
- [x] Session persistence across page reloads

**Criticality:** CRITICAL (blocks all other features)

#### Inventory Management - Products (`admin/e2e/inventory.spec.ts`)
- [x] Dashboard displays piece overview
- [x] List products with status filters
- [x] Create new product with name, description, price
- [x] Edit product details
- [x] Upload product images
- [x] Set product variations (size, color, etc.)
- [x] Mark product as sold/reserved/hidden
- [x] Delete product
- [x] Bulk status changes

**Criticality:** CRITICAL (core feature, revenue-dependent)

#### Inventory Management - Bulk Operations (`admin/e2e/inventory-bulk.spec.ts`)
- [x] Bulk select products
- [x] Change status for multiple items
- [x] Export product list
- [x] Import/upload product data
- [x] Batch price updates
- [x] Bulk image uploads

**Criticality:** HIGH (efficiency feature, power users)

#### Materials Inventory (`admin/e2e/materials.page.ts`)
- [ ] List materials with cost tracking
- [ ] Create material entry
- [ ] Update material quantity and cost
- [ ] Archive old materials
- [ ] Track material by supplier
- [ ] View cost per unit calculations

**Criticality:** HIGH (cost tracking, margins)

#### Settings & Configuration (`admin/e2e/settings.page.ts`)
- [ ] Tenant profile (name, email, branding)
- [ ] Storefront customization (colors, logo)
- [ ] Payment settings (Stripe Connect authorization)
- [ ] Subscription plan display
- [ ] Feature access based on plan (tier validation)
- [ ] Password reset/security
- [ ] Logout from settings

**Criticality:** MEDIUM (admin functions, security)

#### Social Publishing (`admin/e2e/social.spec.ts`) - TODO
- [ ] Schedule post with text and images
- [ ] AI caption generation
- [ ] Select social platforms (Instagram, TikTok, Pinterest)
- [ ] View published posts
- [ ] Edit post before publishing
- [ ] Delete scheduled post

**Criticality:** MEDIUM (engagement feature, Maker+ plans)

### Web App (Storefront & Checkout)

#### Storefront Display (`web/e2e/checkout.spec.ts` - Homepage & Products)
- [x] Tenant storefront loads without error
- [x] Products display on storefront
- [x] Product details page shows name, price, images
- [x] Add to cart button visible
- [x] Mobile responsiveness (375x667 viewport)
- [x] Invalid tenant handling (404)
- [x] Invalid product handling (404)

**Criticality:** CRITICAL (customer-facing)

#### Shopping Cart (`web/e2e/checkout.spec.ts` - Shopping Cart)
- [x] Cart page displays
- [x] Cart shows items or empty state
- [x] Cart total displays
- [x] Update item quantity
- [x] Remove item from cart
- [x] Cart persists across sessions

**Criticality:** CRITICAL (revenue path)

#### Checkout Flow (`web/e2e/checkout.spec.ts` - Checkout Flow)
- [x] Navigate to checkout from cart
- [x] Checkout form displays required fields
- [x] Validate required fields (email, name, address)
- [x] Submit checkout (redirects to Stripe or shows success)
- [x] Stripe Checkout integration
- [x] Mobile checkout experience

**Criticality:** CRITICAL (transaction completion)

#### Order & Reviews (`web/e2e/reviews.spec.ts`) - TODO
- [ ] Display product reviews
- [ ] Submit review after purchase
- [ ] Star rating system
- [ ] Review moderation (admin view)
- [ ] Search/filter reviews
- [ ] Block abuse/spam

**Criticality:** MEDIUM (social proof, engagement)

#### Multi-tenant Isolation (`web/e2e/isolation.spec.ts`) - TODO
- [ ] Products isolated per tenant
- [ ] Cart isolated per tenant
- [ ] Customer data isolated per tenant
- [ ] URL routing enforces tenant boundaries

**Criticality:** CRITICAL (security, data integrity)

## Testing Priorities

### Phase 1: Foundation (MVP)
1. Admin Auth (blocks everything)
2. Product Inventory (core feature)
3. Storefront Display (customer entry point)
4. Shopping Cart (transaction initiation)
5. Checkout Flow (revenue)

### Phase 2: Completeness
6. Bulk Operations (power user efficiency)
7. Materials Tracking (cost management)
8. Admin Settings (configuration)
9. Multi-tenant Isolation (data integrity)
10. Mobile Responsiveness (market coverage)

### Phase 3: Polish
11. Social Publishing (engagement)
12. Product Reviews (social proof)
13. Error Handling & Edge Cases
14. Performance Testing (load times)

## Environment Requirements

### Local Development
```bash
# Required services
docker run -d --name madebuy-mongo -p 27017:27017 mongo:7

# Running dev servers (separate terminals)
pnpm --filter admin dev --port 3300
pnpm --filter web dev --port 3301

# Run tests against localhost
pnpm --filter admin test:e2e
pnpm --filter web test:e2e
```

### CI/CD Environment
- MongoDB instance accessible
- Admin server at `http://localhost:3300`
- Web server at `http://localhost:3301`
- Test artifacts: screenshots (on failure), traces, videos (optional)

### Timeouts
- Page navigation: 15 seconds
- Form submission: 10 seconds
- Network requests: 5 seconds
- Default: 30 seconds

## Test Data Requirements

### Test Tenant
- Email: Set via `E2E_TEST_EMAIL` env var
- Password: Set via `E2E_TEST_PASSWORD` env var
- Slug: Set via `E2E_TEST_TENANT` env var (e.g., "demo" or "test-store")

### Test Account Setup
```bash
# Create via dashboard or API
# Requires valid email + password for authentication tests

# With products for checkout tests
# Requires product slug in E2E_TEST_PRODUCT_SLUG
```

### Test Product
- Slug: Set via `E2E_TEST_PRODUCT_SLUG` env var
- Must be in test tenant's inventory
- Must have price and images for full UI tests

### Test Materials
- Auto-created by tests if needed
- Prefixed with "E2E Test" for cleanup

## Test Data Cleanup

- **Test products:** Named with timestamp, auto-cleanup in teardown
- **Test materials:** Prefixed with "Test Material", archived after tests
- **Test images:** Uploaded to R2, linked to test records only
- **Cart data:** Browser session-based, clears on browser close

## Page Object Pattern

All tests use page objects for maintainability:

```
pages/
  ├── auth.page.ts          → Login/logout
  ├── dashboard.page.ts     → Overview, statistics
  ├── pieces.page.ts        → Product CRUD
  ├── materials.page.ts     → Materials inventory
  └── settings.page.ts      → Configuration

fixtures/
  └── index.ts              → Custom test fixtures
```

Each page object encapsulates selectors and interactions, making tests resilient to UI changes.

## Fixtures & Helpers

### Custom Fixtures
- `authPage` - Authentication page object
- `dashboardPage` - Dashboard overview
- `piecesPage` - Product inventory page
- `materialsPage` - Materials tracking page
- `settingsPage` - Admin settings page
- `authenticatedPage` - Pre-logged-in page for quick test setup

### Test Data Generators
```typescript
testData.generateProductName()        // Unique names
testData.createProduct(overrides)     // Product factory
testData.createMaterial(overrides)    // Material factory
testData.createCustomer(overrides)    // Customer factory
```

### Network Helpers
```typescript
waitForNetworkIdle(page, timeout)              // Wait for requests
waitForApiResponse(page, urlPattern, options)  // Wait for specific API
takeDebugScreenshot(page, name)                // Debug captures
```

## Running Tests

See `E2E_TESTING_INSTRUCTIONS.md` for detailed setup and execution.

Quick start:
```bash
# Admin tests
pnpm --filter admin test:e2e

# Web tests
pnpm --filter web test:e2e

# Headed mode (visible browser)
pnpm --filter admin test:e2e:headed

# UI mode (interactive debugger)
pnpm --filter admin test:e2e:ui
```

## Monitoring & Debugging

- **Traces:** Saved on test failure (`.playwright/trace.zip`)
- **Screenshots:** Captured on failure in `test-results/`
- **HTML Report:** Open with `npx playwright show-report`
- **Video:** Optional (disabled by default, enable in config)

## Known Limitations

1. **Stripe Integration:** Tests stop at checkout redirect. Full payment flow requires test Stripe account.
2. **Social APIs:** Late API and OpenAI calls mocked or skipped in tests.
3. **Image Upload:** Placeholder image handling; R2 integration tested separately.
4. **Real Email:** Verification emails not tested; use mock email or skip verification.

## Maintenance

- **Update frequency:** Weekly during active development
- **Flakiness:** Investigate and fix root cause, don't add random waits
- **Coverage:** Add tests for bug fixes to prevent regression
- **Dependencies:** Keep Playwright updated monthly
