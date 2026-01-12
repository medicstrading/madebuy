import { test as base, expect, Page, BrowserContext } from '@playwright/test'
import { AuthPage } from '../pages/auth.page'
import { DashboardPage } from '../pages/dashboard.page'
import { PiecesPage } from '../pages/pieces.page'
import { SettingsPage } from '../pages/settings.page'
import { MaterialsPage } from '../pages/materials.page'

/**
 * Extended Playwright test fixtures for MadeBuy Admin E2E tests
 *
 * Provides:
 * - Page objects for common pages
 * - Authenticated user sessions
 * - Test data factories
 */

// Test configuration from environment
export const testConfig = {
  testEmail: process.env.E2E_TEST_EMAIL || 'test@example.com',
  testPassword: process.env.E2E_TEST_PASSWORD || 'testpassword123',
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3300',
  timeout: 30000,
}

// Custom test fixtures
type AdminFixtures = {
  authPage: AuthPage
  dashboardPage: DashboardPage
  piecesPage: PiecesPage
  settingsPage: SettingsPage
  materialsPage: MaterialsPage
  authenticatedPage: Page
}

export const test = base.extend<AdminFixtures>({
  // Page object fixtures
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page))
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page))
  },

  piecesPage: async ({ page }, use) => {
    await use(new PiecesPage(page))
  },

  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page))
  },

  materialsPage: async ({ page }, use) => {
    await use(new MaterialsPage(page))
  },

  // Pre-authenticated page fixture
  authenticatedPage: async ({ page, context }, use) => {
    // Skip auth if no credentials configured
    if (!process.env.E2E_TEST_EMAIL) {
      throw new Error('E2E_TEST_EMAIL not configured - cannot create authenticated page')
    }

    const authPage = new AuthPage(page)
    await authPage.goto()
    await authPage.login(testConfig.testEmail, testConfig.testPassword)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: testConfig.timeout })

    await use(page)
  },
})

// Export expect for convenience
export { expect }

// Test data generators
export const testData = {
  /**
   * Generate a unique product name for tests
   */
  generateProductName(prefix = 'Test Product'): string {
    return `${prefix} ${Date.now()}-${Math.random().toString(36).substring(7)}`
  },

  /**
   * Generate test product data
   */
  createProduct(overrides: Partial<TestProduct> = {}): TestProduct {
    return {
      name: this.generateProductName(),
      description: 'Automatically created by E2E tests',
      price: 29.99,
      status: 'available',
      quantity: 1,
      ...overrides,
    }
  },

  /**
   * Generate test material data
   */
  createMaterial(overrides: Partial<TestMaterial> = {}): TestMaterial {
    return {
      name: `Test Material ${Date.now()}`,
      description: 'E2E test material',
      category: 'General',
      unit: 'pcs',
      quantity: 100,
      costPerUnit: 5.00,
      ...overrides,
    }
  },

  /**
   * Generate test customer data
   */
  createCustomer(overrides: Partial<TestCustomer> = {}): TestCustomer {
    const id = Date.now()
    return {
      email: `test-customer-${id}@example.com`,
      firstName: 'Test',
      lastName: `Customer ${id}`,
      ...overrides,
    }
  },
}

// Type definitions for test data
export interface TestProduct {
  name: string
  description: string
  price: number
  status: 'available' | 'sold' | 'reserved' | 'hidden'
  quantity: number
  category?: string
  images?: string[]
}

export interface TestMaterial {
  name: string
  description: string
  category: string
  unit: string
  quantity: number
  costPerUnit: number
  supplier?: string
}

export interface TestCustomer {
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: {
    line1: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

/**
 * Helper to wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Helper to wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options: { status?: number; timeout?: number } = {}
): Promise<void> {
  const { status = 200, timeout = 10000 } = options
  await page.waitForResponse(
    (response) => {
      const matches = typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())
      return matches && response.status() === status
    },
    { timeout }
  )
}

/**
 * Take a screenshot with timestamp for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({
    path: `./test-results/debug-${name}-${timestamp}.png`,
    fullPage: true,
  })
}
