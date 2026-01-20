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
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  globalSetup: './e2e/global-setup.ts',
  outputDir: 'test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3301',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport for responsive testing (using Chrome mobile emulation)
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        // Use chromium for mobile tests - webkit needs system dependencies
      },
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
