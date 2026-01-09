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
      await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
    })

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.goto('/login')

      // Submit empty form
      await page.getByRole('button', { name: /sign in|log in/i }).click()

      // Should show validation error or stay on login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login')

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com')
      await page.getByLabel(/password/i).fill('wrongpassword')
      await page.getByRole('button', { name: /sign in|log in/i }).click()

      // Should show error message
      await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({ timeout: 10000 })
    })

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Authenticated Flow', () => {
    // These tests require a test account to be set up
    // Skip if no test credentials are configured
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com'
    const testPassword = process.env.E2E_TEST_PASSWORD || 'testpassword123'

    test.skip(!process.env.E2E_TEST_EMAIL, 'Test credentials not configured')

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login')

      // Fill in valid credentials
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /sign in|log in/i }).click()

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    })

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /sign in|log in/i }).click()

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
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/password/i).fill(testPassword)
      await page.getByRole('button', { name: /sign in|log in/i }).click()

      // Wait for dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

      // Reload page
      await page.reload()

      // Should still be on dashboard (session persisted)
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })
})
