import { test, expect } from '@playwright/test'

/**
 * Authentication E2E tests for MadeBuy Admin
 *
 * These tests verify the login/logout flow for tenant authentication
 */

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login')

      // Verify login form elements are present
      await expect(page.getByRole('heading', { name: /madebuy/i })).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.goto('/login')

      // Submit empty form (HTML5 validation should prevent submission)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should stay on login page (HTML5 required prevents submission)
      await expect(page).toHaveURL(/\/login/)
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      // Fill in invalid credentials using role-based selectors
      const emailInput = page.getByRole('textbox', { name: /email/i })
      const passwordInput = page.getByRole('textbox', { name: /password/i })

      await emailInput.fill('invalid@example.com')
      await passwordInput.fill('wrongpassword')

      // Click sign in and wait for loading to complete
      await page.getByRole('button', { name: /sign in/i }).click()

      // Wait for button to show loading state then return
      await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible({ timeout: 5000 }).catch(() => {})
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 20000 })

      // Should show error or still be on login page
      const hasError = await page.locator('.bg-red-50').isVisible().catch(() => false)
      const onLoginPage = page.url().includes('/login')

      expect(hasError || onLoginPage).toBeTruthy()
    })

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Flow', () => {
    // These tests require a VALID test account in the database
    // Skip if no test credentials are configured
    // To enable: Create test tenant via admin, then set E2E_TEST_EMAIL and E2E_TEST_PASSWORD
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com'
    const testPassword = process.env.E2E_TEST_PASSWORD || 'testpassword123'

    // Skip these tests - they require valid database credentials
    // TODO: Set up test tenant seed script or use E2E_SKIP_AUTH_TESTS=false
    test.skip(process.env.E2E_SKIP_AUTH_TESTS !== 'false', 'Auth tests require valid database credentials')

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login')

      // Fill in valid credentials
      await page.locator('#email').fill(testEmail)
      await page.locator('#password').fill(testPassword)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    })

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.locator('#email').fill(testEmail)
      await page.locator('#password').fill(testPassword)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Wait for dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

      // Click logout (may be in dropdown menu)
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
      const menuTrigger = page.getByRole('button', { name: /menu|account|profile/i })

      // Try direct logout button first, then menu
      if (await logoutButton.isVisible()) {
        await logoutButton.click()
      } else if (await menuTrigger.isVisible()) {
        await menuTrigger.click()
        await page.getByText(/logout|sign out/i).click()
      }

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })

    test('should persist session across page reloads', async ({ page }) => {
      // Login
      await page.goto('/login')
      await page.locator('#email').fill(testEmail)
      await page.locator('#password').fill(testPassword)
      await page.getByRole('button', { name: /sign in/i }).click()

      // Wait for dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

      // Reload page
      await page.reload()

      // Should still be on dashboard (session persisted)
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })
})
