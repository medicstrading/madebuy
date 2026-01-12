import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

/**
 * Global setup for MadeBuy Web (Storefront) E2E tests
 *
 * This runs once before all tests. Use it to:
 * - Seed database with test tenant and products
 * - Set up test data for checkout flows
 * - Initialize test environment
 */

export const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'user.json')

async function globalSetup(config: FullConfig) {
  console.log('[Global Setup] Starting web test setup...')

  const { baseURL } = config.projects[0].use

  // Uncomment to seed test data
  // You can use the admin API or database directly to create test data
  /*
  console.log('[Global Setup] Seeding test tenant data...')

  // Example: Create test tenant with products
  // This would typically call your API or seed script
  // await fetch(`${process.env.ADMIN_URL}/api/test/seed`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     tenantSlug: 'test-store',
  //     products: [
  //       { name: 'Test Product 1', price: 29.99, stock: 10 },
  //       { name: 'Test Product 2', price: 49.99, stock: 5 },
  //     ],
  //   }),
  // })

  console.log('[Global Setup] Test data seeded')
  */

  // Verify the web server is accessible
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('[Global Setup] Verifying web server is accessible...')

  try {
    await page.goto(baseURL || 'http://localhost:3301', { timeout: 10000 })
    console.log('[Global Setup] Web server is accessible')
  } catch (error) {
    console.warn('[Global Setup] Web server not accessible - tests may fail. Start with: pnpm --filter web dev')
    // Don't throw - let individual tests fail if server is down
  }

  await browser.close()

  console.log('[Global Setup] Web setup complete')
}

export default globalSetup
