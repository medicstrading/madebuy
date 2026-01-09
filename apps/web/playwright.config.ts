import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for MadeBuy Web (Storefront) E2E tests
 *
 * Run tests with:
 *   pnpm --filter web test:e2e
 *   pnpm --filter web test:e2e:headed  (visible browser)
 *
 * Tests expect web dev server at localhost:3301
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3301',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport for responsive testing
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  // Web server auto-start (optional, useful for CI)
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3301',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})
