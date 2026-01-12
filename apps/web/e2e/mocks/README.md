# Storefront API Mocking Utilities

This directory contains utilities for mocking storefront API routes in E2E tests using Playwright's `page.route()` API.

## Overview

API mocking allows storefront tests to run without hitting real backend endpoints, providing:
- **Faster tests** - No network latency or database operations
- **Isolated tests** - Tests don't affect real data or depend on backend state
- **Predictable data** - Full control over API responses
- **Stripe simulation** - Mock Stripe checkout without real payments

## Usage

### Basic Example

```typescript
import { test, expect } from '@playwright/test'
import {
  mockStorefrontApi,
  mockProductsApi,
  createMockTenant,
  createMockProduct
} from './mocks/api.mock'

test('should display products in storefront', async ({ page }) => {
  const tenant = createMockTenant({ slug: 'demo' })
  const products = [
    createMockProduct({ name: 'Handmade Ring', price: 4999 }),
    createMockProduct({ name: 'Silver Necklace', price: 7999 }),
  ]

  // Mock storefront APIs
  await mockStorefrontApi(page, 'demo', tenant)
  await mockProductsApi(page, 'demo', products)

  // Navigate and test
  await page.goto('/demo')
  await expect(page.getByText('Handmade Ring')).toBeVisible()
  await expect(page.getByText('$49.99')).toBeVisible()
})
```

### Complete Storefront Setup

For tests that need full mocked storefront:

```typescript
import { setupMockedStorefront, createMockProduct } from './mocks/api.mock'

test('should work with complete mocked storefront', async ({ page }) => {
  await setupMockedStorefront(page, 'demo', {
    tenant: { businessName: 'Demo Shop' },
    products: [
      createMockProduct({ isFeatured: true }),
      createMockProduct({ name: 'Regular Product' }),
    ],
  })

  await page.goto('/demo')
  // All storefront APIs are now mocked
})
```

## Mock Data Factories

### createMockTenant(overrides?)
Create mock tenant/shop with storefront settings.

```typescript
const tenant = createMockTenant({
  slug: 'my-shop',
  businessName: 'My Handmade Shop',
  primaryColor: '#3b82f6',
  websiteDesign: {
    template: 'modern',
  },
})
```

### createMockProduct(overrides?)
Create mock product for storefront display.

```typescript
const product = createMockProduct({
  name: 'Custom Ring',
  price: 4999,
  stock: 10,
  isFeatured: true,
})
```

### createMockMedia(overrides?)
Create mock media with CDN URLs and variants.

```typescript
const media = createMockMedia({
  url: 'https://cdn.example.com/product.jpg',
  variants: {
    thumbnail: 'https://cdn.example.com/product-thumb.jpg',
    medium: 'https://cdn.example.com/product-med.jpg',
  },
})
```

### createMockCart(items?)
Create mock cart with calculated totals.

```typescript
const cart = createMockCart([
  { productSlug: 'handmade-ring', quantity: 1 },
  { productSlug: 'silver-necklace', quantity: 2 },
])
```

### createMockDiscount(overrides?)
Create mock discount code.

```typescript
const discount = createMockDiscount({
  code: 'SAVE20',
  type: 'percentage',
  value: 20,
})
```

### createMockCustomer(overrides?)
Create mock customer with address.

```typescript
const customer = createMockCustomer({
  email: 'customer@example.com',
  firstName: 'Jane',
  addresses: [{
    line1: '123 Main St',
    city: 'Sydney',
    state: 'NSW',
    postalCode: '2000',
    country: 'AU',
  }],
})
```

## API Mocking Functions

### Storefront Data

#### mockStorefrontApi(page, tenantSlug, tenant)
Mock tenant/shop data for storefront.

```typescript
await mockStorefrontApi(page, 'demo', mockTenant)
```

### Products

#### mockProductsApi(page, tenantSlug, products)
Mock product listing endpoint.

```typescript
await mockProductsApi(page, 'demo', [product1, product2])
```

#### mockProductDetailApi(page, tenantSlug, productSlug, product, media?)
Mock single product detail with optional media.

```typescript
await mockProductDetailApi(page, 'demo', 'handmade-ring', product, [media1, media2])
```

#### mockFeaturedProductsApi(page, tenantSlug, products)
Mock featured products for homepage.

```typescript
await mockFeaturedProductsApi(page, 'demo', featuredProducts)
```

### Cart & Checkout

#### mockCartValidationApi(page, tenantSlug, validatedCart)
Mock cart validation with calculated totals.

```typescript
const cart = createMockCart([
  { productSlug: 'ring', quantity: 1 }
])
await mockCartValidationApi(page, 'demo', cart)
```

#### mockDiscountValidationApi(page, tenantSlug, code, discount)
Mock discount code validation.

```typescript
// Valid discount
await mockDiscountValidationApi(page, 'demo', 'SAVE10', mockDiscount)

// Invalid discount
await mockDiscountValidationApi(page, 'demo', 'INVALID', null)
```

#### mockStripeCheckoutApi(page, tenantSlug, sessionId?, sessionUrl?)
Mock Stripe checkout session creation.

```typescript
await mockStripeCheckoutApi(
  page,
  'demo',
  'cs_test_mock123',
  'https://checkout.stripe.com/pay/cs_test_mock123'
)
```

### Orders

#### mockOrderCreateApi(page, tenantSlug, order)
Mock order creation (for non-Stripe flows).

```typescript
await mockOrderCreateApi(page, 'demo', mockOrder)
```

#### mockOrderStatusApi(page, tenantSlug, orderId, order)
Mock order status check.

```typescript
await mockOrderStatusApi(page, 'demo', 'order-123', mockOrder)
```

### Contact & Engagement

#### mockEnquiryApi(page, tenantSlug, success?)
Mock contact form submission.

```typescript
// Success
await mockEnquiryApi(page, 'demo', true)

// Error
await mockEnquiryApi(page, 'demo', false)
```

#### mockNewsletterApi(page, tenantSlug, success?)
Mock newsletter subscription.

```typescript
await mockNewsletterApi(page, 'demo', true)
```

### Shipping

#### mockShippingRatesApi(page, tenantSlug, rates)
Mock shipping rate calculation.

```typescript
await mockShippingRatesApi(page, 'demo', [
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 1000, // $10
    estimatedDays: { min: 3, max: 5 },
  },
  {
    id: 'express',
    name: 'Express Shipping',
    price: 2500, // $25
    estimatedDays: { min: 1, max: 2 },
  },
])
```

### Analytics

#### mockAnalyticsApi(page, tenantSlug)
Mock analytics tracking (silent, always succeeds).

```typescript
await mockAnalyticsApi(page, 'demo')
```

### Error Testing

#### mockApiError(page, urlPattern, status?, errorMessage?)
Mock error responses for testing error handling.

```typescript
// Mock 404 for product not found
await mockApiError(page, '**/api/storefront/demo/products/invalid', 404, 'Product not found')

// Mock 500 for checkout errors
await mockApiError(page, '**/api/storefront/demo/checkout', 500, 'Payment processing failed')
```

## Complete Scenarios

### Shopping Flow Test

```typescript
test('complete shopping flow', async ({ page }) => {
  // Setup storefront
  const tenant = createMockTenant({ slug: 'demo' })
  const product = createMockProduct({ slug: 'handmade-ring', price: 4999 })
  const media = createMockMedia()

  await mockStorefrontApi(page, 'demo', tenant)
  await mockProductsApi(page, 'demo', [product])
  await mockProductDetailApi(page, 'demo', 'handmade-ring', product, [media])

  // Mock cart validation
  const cart = createMockCart([{ productSlug: 'handmade-ring', quantity: 1 }])
  await mockCartValidationApi(page, 'demo', cart)

  // Mock Stripe checkout
  await mockStripeCheckoutApi(page, 'demo')

  // Test flow
  await page.goto('/demo')
  await page.click('text=Handmade Ring')
  await page.click('button:has-text("Add to Cart")')
  await page.click('a:has-text("Checkout")')
  await expect(page).toHaveURL(/stripe\.com/)
})
```

### Discount Code Test

```typescript
test('apply discount code', async ({ page }) => {
  const tenant = createMockTenant({ slug: 'demo' })
  const discount = createMockDiscount({ code: 'SAVE20', value: 20 })

  await mockStorefrontApi(page, 'demo', tenant)
  await mockDiscountValidationApi(page, 'demo', 'SAVE20', discount)

  // Setup cart with dynamic discount calculation
  await page.route('**/api/storefront/demo/cart/validate', async (route) => {
    const body = route.request().postDataJSON()
    const cart = createMockCart(body.items)

    // Apply discount
    if (body.discountCode === 'SAVE20') {
      cart.discount = Math.round(cart.subtotal * 0.2)
      cart.total = cart.subtotal + cart.shipping + cart.tax - cart.discount
    }

    await route.fulfill({
      status: 200,
      body: JSON.stringify(cart),
    })
  })

  await page.goto('/demo/cart')
  await page.fill('input[name="discountCode"]', 'SAVE20')
  await page.click('button:has-text("Apply")')
  await expect(page.getByText(/20% off/i)).toBeVisible()
})
```

### Error Handling Test

```typescript
test('handle checkout errors gracefully', async ({ page }) => {
  await setupMockedStorefront(page, 'demo', {
    products: [createMockProduct()],
  })

  // Mock checkout failure
  await mockApiError(
    page,
    '**/api/storefront/demo/checkout',
    500,
    'Payment processing failed'
  )

  await page.goto('/demo/checkout')
  await page.click('button:has-text("Complete Purchase")')
  await expect(page.getByText(/payment processing failed/i)).toBeVisible()
})
```

## Best Practices

1. **Use setupMockedStorefront** - For most tests, use the complete setup function
2. **Mock CDN URLs** - Use realistic CDN URLs in media mocks for visual testing
3. **Calculate totals** - Use `createMockCart` to ensure accurate price calculations
4. **Test error states** - Use `mockApiError` to test error handling
5. **Stripe simulation** - Mock Stripe checkout to avoid real payment processing
6. **Clear mocks** - Clear mocks between tests to prevent pollution

## Storefront-Specific Features

### Custom Domain Testing

```typescript
const tenant = createMockTenant({
  customDomain: 'shop.example.com',
  domainStatus: 'active',
})
await mockStorefrontApi(page, 'demo', tenant)
```

### Template Testing

```typescript
const tenant = createMockTenant({
  websiteDesign: {
    template: 'modern',
    showFeaturedProducts: true,
    showBlog: false,
  },
})
```

### Multi-Currency

```typescript
const product = createMockProduct({
  price: 4999,
  currency: 'USD',
})
```

## Examples

See test files for complete examples:
- `apps/web/e2e/storefront.spec.ts` - Basic storefront display
- `apps/web/e2e/product.spec.ts` - Product detail pages
- `apps/web/e2e/cart.spec.ts` - Shopping cart operations
- `apps/web/e2e/checkout.spec.ts` - Checkout flow with Stripe
