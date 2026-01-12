# API Mocking Utilities

This directory contains utilities for mocking API routes in E2E tests using Playwright's `page.route()` API.

## Overview

API mocking allows tests to run without hitting real API endpoints, providing:
- **Faster tests** - No network latency or database operations
- **Isolated tests** - Tests don't affect real data or depend on backend state
- **Predictable data** - Full control over API responses
- **Error testing** - Easy to simulate error conditions

## Usage

### Basic Example

```typescript
import { test, expect } from '@playwright/test'
import {
  mockAuthenticatedSession,
  mockPiecesListApi,
  createMockPiece
} from './mocks/api.mock'

test('should display products', async ({ page }) => {
  // Setup authenticated session
  await mockAuthenticatedSession(page)

  // Mock products API
  const mockProducts = [
    createMockPiece({ name: 'Test Ring', price: 9999 }),
    createMockPiece({ name: 'Test Necklace', price: 14999 }),
  ]
  await mockPiecesListApi(page, mockProducts)

  // Navigate and test
  await page.goto('/inventory')
  await expect(page.getByText('Test Ring')).toBeVisible()
  await expect(page.getByText('Test Necklace')).toBeVisible()
})
```

### Complete Environment Setup

For tests that need full mocked environment:

```typescript
import { setupMockedApi, createMockPiece, createMockMaterial } from './mocks/api.mock'

test('should work with mocked environment', async ({ page }) => {
  await setupMockedApi(page, {
    tenant: { businessName: 'Test Shop' },
    pieces: [createMockPiece()],
    materials: [createMockMaterial()],
  })

  await page.goto('/dashboard')
  // All API calls are now mocked
})
```

## Mock Data Factories

### createMockTenant(overrides?)
Create mock tenant with sensible defaults.

```typescript
const tenant = createMockTenant({
  businessName: 'My Shop',
  plan: 'professional',
})
```

### createMockPiece(overrides?)
Create mock piece/product.

```typescript
const piece = createMockPiece({
  name: 'Custom Ring',
  price: 19999,
  status: 'available',
  stock: 5,
})
```

### createMockMaterial(overrides?)
Create mock material.

```typescript
const material = createMockMaterial({
  name: 'Sterling Silver',
  quantity: 100,
  costPerUnit: 500,
})
```

### createMockOrder(overrides?)
Create mock order.

```typescript
const order = createMockOrder({
  customerName: 'John Doe',
  status: 'pending',
  total: 12099,
})
```

### createMockCustomer(overrides?)
Create mock customer.

```typescript
const customer = createMockCustomer({
  email: 'test@example.com',
  firstName: 'Jane',
})
```

### createMockMedia(overrides?)
Create mock media item.

```typescript
const media = createMockMedia({
  url: 'https://example.com/image.jpg',
  type: 'image',
})
```

## API Mocking Functions

### Authentication

#### mockAuthenticatedSession(page, tenant?)
Mock NextAuth session and tenant data.

```typescript
await mockAuthenticatedSession(page, {
  businessName: 'Test Shop',
  email: 'test@example.com',
})
```

### Pieces/Products

#### mockPiecesListApi(page, pieces)
Mock GET /api/pieces endpoint.

```typescript
await mockPiecesListApi(page, [piece1, piece2])
```

#### mockPieceDetailApi(page, pieceId, piece)
Mock GET /api/pieces/:id endpoint.

```typescript
await mockPieceDetailApi(page, 'piece-1', mockPiece)
```

#### mockPieceCreateApi(page, createdPiece)
Mock POST /api/pieces endpoint.

```typescript
await mockPieceCreateApi(page, newPiece)
```

#### mockPieceUpdateApi(page, pieceId, updatedPiece)
Mock PUT/PATCH /api/pieces/:id endpoint.

```typescript
await mockPieceUpdateApi(page, 'piece-1', updatedPiece)
```

#### mockPieceDeleteApi(page, pieceId)
Mock DELETE /api/pieces/:id endpoint.

```typescript
await mockPieceDeleteApi(page, 'piece-1')
```

### Materials

#### mockMaterialsApi(page, materials)
Mock GET /api/materials endpoint.

```typescript
await mockMaterialsApi(page, [material1, material2])
```

### Orders

#### mockOrdersApi(page, orders)
Mock GET /api/orders endpoint.

```typescript
await mockOrdersApi(page, [order1, order2])
```

#### mockOrderDetailApi(page, orderId, order)
Mock GET /api/orders/:id endpoint.

```typescript
await mockOrderDetailApi(page, 'order-1', mockOrder)
```

### Customers

#### mockCustomersApi(page, customers)
Mock GET /api/customers endpoint.

```typescript
await mockCustomersApi(page, [customer1, customer2])
```

### Media

#### mockMediaUploadApi(page, uploadedMedia)
Mock POST /api/media/upload endpoint.

```typescript
await mockMediaUploadApi(page, newMedia)
```

### Bulk Operations

#### mockBulkOperationsApi(page, result)
Mock POST /api/pieces/bulk endpoint.

```typescript
await mockBulkOperationsApi(page, {
  success: 5,
  failed: 0,
})
```

### Error Testing

#### mockApiError(page, urlPattern, status?, errorMessage?)
Mock error responses for testing error handling.

```typescript
// Mock 404 for specific piece
await mockApiError(page, '**/api/pieces/invalid-id', 404, 'Not found')

// Mock 500 for all piece requests
await mockApiError(page, '**/api/pieces**', 500, 'Server error')
```

## Advanced Usage

### Conditional Mocking

Mock only specific methods while allowing others:

```typescript
await page.route('**/api/pieces', async (route) => {
  if (route.request().method() === 'GET') {
    // Mock GET requests
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ pieces: mockPieces }),
    })
  } else {
    // Allow POST/PUT/DELETE to hit real API
    await route.continue()
  }
})
```

### Dynamic Responses

Return different responses based on request:

```typescript
await page.route('**/api/pieces/**', async (route) => {
  const url = route.request().url()
  const pieceId = url.split('/').pop()

  const piece = mockPieces.find(p => p.id === pieceId)

  if (piece) {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ piece }),
    })
  } else {
    await route.fulfill({
      status: 404,
      body: JSON.stringify({ error: 'Not found' }),
    })
  }
})
```

### Clearing Mocks

Clear all mocks to restore default behavior:

```typescript
import { clearApiMocks } from './mocks/api.mock'

test.afterEach(async ({ page }) => {
  await clearApiMocks(page)
})
```

## Best Practices

1. **Use factories** - Always use `createMock*` functions for consistent test data
2. **Minimal overrides** - Only override fields you need to test
3. **Clear mocks** - Clear mocks in `afterEach` to prevent test pollution
4. **Test errors** - Use `mockApiError` to test error handling
5. **Realistic data** - Use realistic values in mock data (prices in cents, valid dates, etc.)

## Examples

See test files for complete examples:
- `apps/admin/e2e/inventory.spec.ts` - Piece CRUD operations
- `apps/admin/e2e/inventory-bulk.spec.ts` - Bulk operations
- `apps/admin/e2e/auth.spec.ts` - Authentication flows
