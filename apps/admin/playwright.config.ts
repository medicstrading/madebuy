import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for MadeBuy Admin E2E tests
 *
 * Run tests with:
 *   pnpm --filter admin test:e2e
 *   pnpm --filter admin test:e2e:headed  (visible browser)
 *
 * Tests expect admin dev server at localhost:3300
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3300',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment for multi-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // Web server auto-start (optional, useful for CI)
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3300',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})
