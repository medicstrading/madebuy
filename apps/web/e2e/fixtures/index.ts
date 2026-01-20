import { test as base, expect, type Page } from '@playwright/test'
import { CartPage } from '../pages/cart.page'
import { CheckoutPage } from '../pages/checkout.page'
import { ProductPage } from '../pages/product.page'
import { StorefrontPage } from '../pages/storefront.page'

/**
 * Extended Playwright test fixtures for MadeBuy Web (Storefront) E2E tests
 *
 * Provides:
 * - Page objects for common pages
 * - Test tenant configuration
 * - Cart manipulation utilities
 */

// Test configuration from environment
export const testConfig = {
  testTenant: process.env.E2E_TEST_TENANT || 'test-shop',
  testProductSlug: process.env.E2E_TEST_PRODUCT_SLUG || '',
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3301',
  timeout: 30000,
}

// Custom test fixtures
type WebFixtures = {
  storefrontPage: StorefrontPage
  productPage: ProductPage
  cartPage: CartPage
  checkoutPage: CheckoutPage
  tenantSlug: string
}

export const test = base.extend<WebFixtures>({
  // Tenant slug fixture
  tenantSlug: [testConfig.testTenant, { option: true }],

  // Page object fixtures
  storefrontPage: async ({ page, tenantSlug }, use) => {
    await use(new StorefrontPage(page, tenantSlug))
  },

  productPage: async ({ page, tenantSlug }, use) => {
    await use(new ProductPage(page, tenantSlug))
  },

  cartPage: async ({ page, tenantSlug }, use) => {
    await use(new CartPage(page, tenantSlug))
  },

  checkoutPage: async ({ page, tenantSlug }, use) => {
    await use(new CheckoutPage(page, tenantSlug))
  },
})

// Export expect for convenience
export { expect }

// Test data generators
export const testData = {
  /**
   * Generate test customer information for checkout
   */
  createCustomer(overrides: Partial<TestCustomer> = {}): TestCustomer {
    const id = Date.now()
    return {
      email: `test-${id}@example.com`,
      firstName: 'Test',
      lastName: `Customer`,
      phone: '0412345678',
      address: {
        line1: '123 Test Street',
        line2: '',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'AU',
      },
      ...overrides,
    }
  },

  /**
   * Generate a test order note/message
   */
  createOrderNote(): string {
    return `Test order - E2E test ${Date.now()}`
  },
}

// Type definitions
export interface TestCustomer {
  email: string
  firstName: string
  lastName: string
  phone?: string
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

export interface TestCartItem {
  productSlug: string
  quantity: number
  options?: Record<string, string>
}

/**
 * Helper to add product to cart via localStorage manipulation
 * Useful for setting up cart state before tests
 */
export async function seedCart(
  page: Page,
  tenantSlug: string,
  items: TestCartItem[],
): Promise<void> {
  await page.evaluate(
    ({ tenant, items }) => {
      const cartKey = `cart-${tenant}`
      const cartData = {
        items: items.map((item) => ({
          productSlug: item.productSlug,
          quantity: item.quantity,
          options: item.options || {},
        })),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem(cartKey, JSON.stringify(cartData))
    },
    { tenant: tenantSlug, items },
  )
}

/**
 * Helper to clear cart
 */
export async function clearCart(page: Page, tenantSlug: string): Promise<void> {
  await page.evaluate((tenant) => {
    localStorage.removeItem(`cart-${tenant}`)
  }, tenantSlug)
}

/**
 * Helper to get cart from localStorage
 */
export async function getCart(
  page: Page,
  tenantSlug: string,
): Promise<{ items: TestCartItem[] } | null> {
  return page.evaluate((tenant) => {
    const cartData = localStorage.getItem(`cart-${tenant}`)
    return cartData ? JSON.parse(cartData) : null
  }, tenantSlug)
}

/**
 * Wait for page to be fully interactive
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  // Wait for any Next.js hydration
  await page.waitForTimeout(500)
}

/**
 * Take debug screenshot
 */
export async function takeDebugScreenshot(
  page: Page,
  name: string,
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({
    path: `./test-results/debug-${name}-${timestamp}.png`,
    fullPage: true,
  })
}
