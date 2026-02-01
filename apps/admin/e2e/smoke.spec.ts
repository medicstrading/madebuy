import { expect, test } from '@playwright/test'

const ADMIN_URL = 'https://madebuyadmin-production.up.railway.app'
const WEB_URL = 'https://madebuyweb-production.up.railway.app'
const TEST_USER = { email: 'admin@test.com', password: 'admin123' }

test.describe('Production Smoke Tests - Public Pages', () => {
  test('Admin login page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`)
    await expect(page.locator('form')).toBeVisible()
  })

  test('Web homepage loads', async ({ page }) => {
    await page.goto(WEB_URL)
    await expect(page.locator('body')).toBeVisible()
  })

  test('Web pricing section loads', async ({ page }) => {
    await page.goto(WEB_URL)
    await page.waitForLoadState('networkidle')
    // Pricing section is dynamically loaded with ssr: false, give it time
    await expect(page.locator('#pricing')).toBeVisible({ timeout: 15000 })
  })

  test('Admin register page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/register`)
    await expect(page.locator('form')).toBeVisible()
  })
})

test.describe('Production Smoke Tests - Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${ADMIN_URL}/login`)
    await page.fill('#email', TEST_USER.email)
    await page.fill('#password', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
  })

  test('Dashboard loads', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveURL(/dashboard/)
  })

  test('Inventory page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard/inventory`)
    await expect(page.locator('body')).toBeVisible()
    // Should not show error page
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('Media page loads without crash', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard/media`)
    await page.waitForLoadState('networkidle')
    // Should not show error page
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
    // Page should be functional
    await expect(page.locator('body')).toBeVisible()
  })

  test('Materials page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard/materials`)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('Orders page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard/orders`)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('Settings page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard/settings`)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('Analytics page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard/analytics`)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('Publish page loads', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard/publish`)
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })
})
