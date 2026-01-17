import path from 'node:path'
import type { FullConfig } from '@playwright/test'

/**
 * Global setup for MadeBuy Admin E2E tests
 *
 * This runs once before all tests. Use it to:
 * - Authenticate once and save storage state
 * - Seed database with test data
 * - Initialize test environment
 *
 * Storage state is saved to .auth/user.json and can be reused in tests.
 */

export const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'user.json')

async function globalSetup(config: FullConfig) {
  console.log('[Global Setup] Starting admin test setup...')

  const { baseURL } = config.projects[0].use

  // Uncomment to enable authentication setup
  // This will authenticate once and save cookies/localStorage for all tests
  /*
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('[Global Setup] Authenticating test user...')

  // Navigate to login page
  await page.goto(`${baseURL}/login`)

  // Fill in test credentials
  await page.getByLabel(/email/i).fill(process.env.TEST_TENANT_EMAIL || 'test@example.com')
  await page.getByLabel(/password/i).fill(process.env.TEST_TENANT_PASSWORD || 'testpass123')
  await page.getByRole('button', { name: /sign in|log in/i }).click()

  // Wait for successful login (adjust selector based on your app)
  await page.waitForURL(/dashboard/, { timeout: 10000 })

  // Save signed-in state to storage
  await context.storageState({ path: STORAGE_STATE_PATH })

  console.log('[Global Setup] Authentication state saved to:', STORAGE_STATE_PATH)

  await browser.close()
  */

  console.log('[Global Setup] Admin setup complete')
}

export default globalSetup
