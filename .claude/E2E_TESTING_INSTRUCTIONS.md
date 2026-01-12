# E2E Testing Instructions for MadeBuy

## Quick Start

### Prerequisites
1. **Node.js & pnpm** installed
2. **MongoDB running** locally or on NUC
3. **Dev servers running** on correct ports
4. **Test tenant created** with email/password

### Run Tests (5 seconds)

```bash
# Admin tests (localhost:3300)
pnpm --filter admin test:e2e

# Web tests (localhost:3301)
pnpm --filter web test:e2e

# Both in one command
pnpm test:e2e
```

Success output: `X passed (X ms)` in green.

---

## Environment Setup

### 1. Start MongoDB

**Local (Docker):**
```bash
docker run -d --name madebuy-mongo -p 27017:27017 mongo:7
```

**NUC (SSH):**
```bash
ssh nuc-dev "docker exec madebuy-dev mongosh" # Verify it's running
```

### 2. Start Dev Servers

**Terminal 1 - Admin:**
```bash
cd /home/aaron/claude-project/madebuy
pnpm --filter admin dev --port 3300
```

**Terminal 2 - Web:**
```bash
cd /home/aaron/claude-project/madebuy
pnpm --filter web dev --port 3301
```

Verify:
- Admin: Open http://localhost:3300/login
- Web: Open http://localhost:3301 (redirects to tenant page)

### 3. Create Test Tenant

**Option A: Via Admin Dashboard**
1. Go to http://localhost:3300/login
2. Create account: email `test@madebuy.local`, password `Test123!`
3. Complete onboarding (select plan, set storefront slug)
4. Add test products for checkout tests

**Option B: Via MongoDB CLI**
```bash
docker exec -it madebuy-mongo mongosh madebuy

# Create tenant
db.tenants.insertOne({
  _id: ObjectId(),
  email: "test@madebuy.local",
  password: "$2a$10$...", // bcrypt hash of "Test123!"
  slug: "test-store",
  name: "Test Store",
  plan: "maker",
  features: {
    socialPublishing: true,
    aiCaptions: true,
    unlimitedPieces: true
  },
  createdAt: new Date()
})

# Create test product
db.pieces.insertOne({
  _id: ObjectId(),
  tenantId: ObjectId("..."),
  name: "Test Product",
  slug: "test-product",
  description: "A test product",
  price: 29.99,
  quantity: 10,
  status: "available",
  createdAt: new Date()
})
```

### 4. Export Environment Variables

**Terminal 3 - Running Tests:**
```bash
export E2E_TEST_EMAIL="test@madebuy.local"
export E2E_TEST_PASSWORD="Test123!"
export E2E_TEST_TENANT="test-store"
export E2E_TEST_PRODUCT_SLUG="test-product"

# Optional: Change base URL for different environment
export E2E_BASE_URL="http://localhost:3300"

# Then run tests
cd /home/aaron/claude-project/madebuy
pnpm --filter admin test:e2e
```

**Persistent Setup (add to `.env.local`):**

Admin app (`apps/admin/.env.local`):
```
# E2E Testing
E2E_TEST_EMAIL=test@madebuy.local
E2E_TEST_PASSWORD=Test123!
E2E_BASE_URL=http://localhost:3300
```

Web app (`apps/web/.env.local`):
```
# E2E Testing
E2E_TEST_EMAIL=test@madebuy.local
E2E_TEST_PASSWORD=Test123!
E2E_TEST_TENANT=test-store
E2E_TEST_PRODUCT_SLUG=test-product
E2E_BASE_URL=http://localhost:3301
```

---

## Running Tests

### Basic Commands

```bash
# Run all admin E2E tests (headless)
pnpm --filter admin test:e2e

# Run specific test file
pnpm --filter admin test:e2e -- auth.spec.ts

# Run tests matching pattern
pnpm --filter admin test:e2e -- --grep "login"

# Run single test
pnpm --filter admin test:e2e -- auth.spec.ts -g "should login successfully"
```

### Debugging & Visibility

```bash
# Headed mode (see browser window)
pnpm --filter admin test:e2e:headed

# Interactive UI mode (Playwright Inspector)
pnpm --filter admin test:e2e:ui

# Slow down execution (see interactions clearly)
pnpm --filter admin test:e2e -- --headed --workers=1 --timeout=60000

# Generate HTML report
pnpm --filter admin test:e2e
npx playwright show-report
```

### Verbose Output

```bash
# Show debug logs
DEBUG=pw:api pnpm --filter admin test:e2e

# Show network requests
DEBUG=pw:api,pw:net pnpm --filter admin test:e2e

# Trace mode (save execution trace)
pnpm --filter admin test:e2e -- --trace on
```

---

## Page Objects & Fixtures

### Using Page Objects

All tests use page objects to interact with the UI:

```typescript
// ✅ Good: Use page object methods
const { authPage } = use
await authPage.goto()
await authPage.login('test@example.com', 'password')

// ❌ Avoid: Direct selectors in tests
await page.getByLabel(/email/i).fill('test@example.com')
```

### Available Page Objects

**Auth** (`pages/auth.page.ts`):
```typescript
authPage.goto()                           // Navigate to login
authPage.login(email, password)          // Submit login form
authPage.logout()                        // Click logout
authPage.fillEmail(email)
authPage.fillPassword(password)
authPage.clickLoginButton()
```

**Dashboard** (`pages/dashboard.page.ts`):
```typescript
dashboardPage.goto()                      // Navigate to dashboard
dashboardPage.getStats()                  // Fetch overview statistics
dashboardPage.navigateToPieces()         // Click pieces link
dashboardPage.navigateToMaterials()      // Click materials link
dashboardPage.navigateToSettings()       // Click settings link
```

**Pieces/Products** (`pages/pieces.page.ts`):
```typescript
piecesPage.goto()                         // Navigate to products
piecesPage.listPieces()                   // View product list
piecesPage.createPiece(productData)      // Create new product
piecesPage.editPiece(id, updates)        // Edit existing product
piecesPage.deletePiece(id)                // Delete product
piecesPage.filterByStatus(status)        // Filter list by status
piecesPage.uploadImages(files)            // Upload product images
```

**Materials** (`pages/materials.page.ts`):
```typescript
materialsPage.goto()                      // Navigate to materials
materialsPage.listMaterials()             // View materials list
materialsPage.createMaterial(data)       // Add new material
materialsPage.updateQuantity(id, qty)    // Update stock
materialsPage.calculateCostPerUnit()     // View cost calculation
```

**Settings** (`pages/settings.page.ts`):
```typescript
settingsPage.goto()                       // Navigate to settings
settingsPage.updateProfile(updates)       // Edit tenant info
settingsPage.updateBranding(colors)       // Customize storefront
settingsPage.connectStripe()              // Authorize Stripe
settingsPage.changePlan(newPlan)          // Upgrade/downgrade
```

### Using Fixtures

The test suite provides custom fixtures:

```typescript
// Pre-authenticated page (auto-logged in)
test('should show dashboard after login', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard')
  // Already authenticated, no login needed
})

// Page objects
test('should create product', async ({ piecesPage, testData }) => {
  const product = testData.createProduct({ name: 'Test Item' })
  await piecesPage.createPiece(product)
})

// Test data generators
test('should generate unique names', async () => {
  const name1 = testData.generateProductName()
  const name2 = testData.generateProductName()
  expect(name1).not.toBe(name2) // Different timestamps
})
```

---

## Writing New Tests

### Test Template

```typescript
import { test, expect, testData } from '../fixtures'

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page, piecesPage }) => {
    // ARRANGE: Navigate to page or set up state
    await piecesPage.goto()

    // ACT: Perform user action
    await piecesPage.createPiece(testData.createProduct())

    // ASSERT: Verify expected outcome
    await expect(page.getByText(/product created/i)).toBeVisible()
  })
})
```

### Best Practices

#### 1. Use Accessible Selectors
```typescript
// ✅ Good: Accessible selectors
await page.getByRole('button', { name: /sign in/i }).click()
await page.getByLabel(/email/i).fill('test@example.com')
await page.getByText(/success/i)

// ❌ Avoid: CSS selectors (brittle)
await page.locator('button.btn-primary').click()
await page.locator('input[type="email"]').fill('test@example.com')
```

#### 2. Wait for Elements Properly
```typescript
// ✅ Good: Built-in waits
await expect(page.getByText(/product saved/i)).toBeVisible()
await page.getByRole('button', { name: /delete/i }).click() // Auto-waits for clickable

// ❌ Avoid: Fixed delays
await page.waitForTimeout(2000) // Bad!
```

#### 3. Use Test Data Generators
```typescript
// ✅ Good: Use factories
const product = testData.createProduct({
  name: 'Custom Product',
  price: 49.99
})

// ❌ Avoid: Hard-coded test data
const product = { name: 'Test Product', price: 29.99 }
```

#### 4. Isolate Tests
```typescript
// ✅ Good: Each test is independent
test('should create product', async ({ piecesPage }) => {
  await piecesPage.createPiece(testData.createProduct())
})

test('should list products', async ({ piecesPage }) => {
  // Doesn't depend on previous test result
  await piecesPage.goto()
})

// ❌ Avoid: Tests that depend on each other
test('test-1', async () => { /* creates product */ })
test('test-2', async () => { /* uses product from test-1 */ })
```

#### 5. Handle Dynamic Content
```typescript
// ✅ Good: Search for dynamic content
const content = await page.locator('body').textContent()
expect(content).toContain('Product saved')

// ✅ Good: Flexible selectors for dynamic IDs
const row = page.locator('table tr').filter({ hasText: 'Test Product' })
await row.getByRole('button', { name: /edit/i }).click()

// ❌ Avoid: Hard-coded IDs that change
await page.locator('#product-12345').click()
```

### Adding Tests for Bug Fixes

Always add a test to prevent regression:

```typescript
// apps/admin/e2e/inventory.spec.ts
test('should save product with long description (issue #123)', async ({ piecesPage }) => {
  const longDescription = 'A'.repeat(2000) // Edge case from bug report

  const product = testData.createProduct({
    description: longDescription
  })

  await piecesPage.createPiece(product)

  // Verify it saved correctly
  await expect(page.getByText(/product created/i)).toBeVisible()
})
```

---

## Debugging Failed Tests

### 1. Read the Error Message
```
Error: Timeout waiting for element

    at PageAssertions.toBeVisible (...)
    at test (inventory.spec.ts:45)
```

**Action:** Check if element exists, CSS selector changed, or timing issue.

### 2. Check the HTML Report
```bash
pnpm --filter admin test:e2e
npx playwright show-report
```

Review:
- Screenshots at failure point
- Timeline of interactions
- Network requests
- Console logs

### 3. Use Headed Mode
```bash
# Run single failing test in visible browser
pnpm --filter admin test:e2e:headed -- inventory.spec.ts -g "should create product"

# Inspect elements in real-time
```

### 4. UI Mode for Interactive Debugging
```bash
pnpm --filter admin test:e2e:ui

# Step through test line-by-line
# Inspect DOM, network requests
# Re-run from any point
```

### 5. Add Debug Statements
```typescript
test('should create product', async ({ page, piecesPage }) => {
  await piecesPage.goto()

  console.log('Current URL:', page.url())
  console.log('Page title:', await page.title())

  // Take screenshot for debugging
  await takeDebugScreenshot(page, 'before-creation')

  await piecesPage.createPiece(testData.createProduct())

  await takeDebugScreenshot(page, 'after-creation')
})
```

### 6. Common Issues & Fixes

**Test times out**
- Element selector doesn't match → Check HTML, use accessible selectors
- Page takes too long → Increase timeout `{ timeout: 60000 }`
- Server not running → Verify dev server is up

**Test flakes intermittently**
- Race condition → Use `waitForNetworkIdle()` or wait for API response
- Timing issue → Don't add waits; fix root cause
- Stale data → Clear test data before test starts

**Element not clickable**
- Element is off-screen → Use `scroll()` first
- Element is disabled → Check test setup (form validation, auth)
- Layer obscured → Check z-index, modals, overlays

**Wrong page/URL**
- Redirect didn't happen → Check auth, server response
- Wrong base URL → Verify `E2E_BASE_URL` env var
- Relative URL issue → Use absolute paths in page objects

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:7
        options: --health-cmd mongosh
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: pnpm

      - run: pnpm install

      - run: pnpm --filter admin dev --port 3300 &
      - run: pnpm --filter web dev --port 3301 &
      - run: sleep 10 # Wait for servers

      - run: pnpm --filter admin test:e2e
        env:
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
          E2E_TEST_TENANT: test-store

      - if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/admin/playwright-report/
```

### Environment Variables for CI

Required secrets in GitHub:
- `E2E_TEST_EMAIL` - Test account email
- `E2E_TEST_PASSWORD` - Test account password
- `MONGODB_URI` - MongoDB connection (if not local)

---

## Performance Considerations

### Parallel Execution
Tests run in parallel by default. To disable:
```bash
pnpm --filter admin test:e2e -- --workers=1
```

### Retries in CI
Failed tests automatically retry 2x in CI (configured in `playwright.config.ts`).

### Timeouts
Adjust global timeout for slow environments:
```typescript
// playwright.config.ts
use: {
  timeout: 60000, // Increase from default 30s
},
```

---

## Maintenance

### Keeping Tests Healthy

1. **Run weekly** - Catch breaking changes early
2. **Fix flakes quickly** - Investigate root cause, don't add waits
3. **Update selectors** - When UI changes, update page objects immediately
4. **Add regression tests** - For every bug fix
5. **Review coverage** - Add tests for new features

### Updating Selectors

When UI changes:
```typescript
// ❌ Old selector no longer matches
await page.getByRole('button', { name: /sign in/i })

// ✅ Update to new selector
await page.getByRole('button', { name: /log in/i })

// Update page object, not individual tests
// pages/auth.page.ts
async clickLoginButton() {
  await this.page.getByRole('button', { name: /log in/i }).click()
}
```

### Monthly Tasks

- Update Playwright: `pnpm update @playwright/test`
- Review failed test artifacts
- Check for deprecated APIs
- Profile test execution time

---

## Resources

- **Playwright Docs:** https://playwright.dev
- **Best Practices:** https://playwright.dev/docs/best-practices
- **Debugging:** https://playwright.dev/docs/debug
- **CI/CD:** https://playwright.dev/docs/ci
