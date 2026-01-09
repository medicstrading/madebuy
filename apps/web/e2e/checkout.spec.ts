import { test, expect } from '@playwright/test'

/**
 * Checkout E2E tests for MadeBuy Web (Storefront)
 *
 * These tests verify the shopping cart and checkout flow
 *
 * Note: Full checkout flow requires a test tenant with products.
 * Set E2E_TEST_TENANT environment variable to the tenant slug.
 */

// Test tenant slug (e.g., "demo-store")
const testTenant = process.env.E2E_TEST_TENANT || 'demo'

test.describe('Storefront', () => {
  test.describe('Homepage', () => {
    test('should display tenant storefront', async ({ page }) => {
      await page.goto(`/${testTenant}`)

      // Page should load without error
      await expect(page).not.toHaveTitle(/error|404|not found/i)

      // Should have some content (logo, products, etc.)
      const content = await page.locator('body').textContent()
      expect(content?.length).toBeGreaterThan(100)
    })

    test('should display products on storefront', async ({ page }) => {
      await page.goto(`/${testTenant}`)

      // Wait for products to load
      await page.waitForTimeout(2000)

      // Look for product cards/items
      const productCards = page.locator('[data-testid="product-card"]')
        .or(page.locator('.product-card'))
        .or(page.locator('article'))
        .or(page.locator('[class*="product"]'))

      // Either products exist or we see an empty state message
      const hasProducts = await productCards.first().isVisible().catch(() => false)
      const hasEmptyState = await page.getByText(/no products|coming soon|empty/i).isVisible().catch(() => false)

      expect(hasProducts || hasEmptyState).toBeTruthy()
    })
  })

  test.describe('Product Page', () => {
    test.skip(!process.env.E2E_TEST_PRODUCT_SLUG, 'Test product slug not configured')

    const productSlug = process.env.E2E_TEST_PRODUCT_SLUG || 'test-product'

    test('should display product details', async ({ page }) => {
      await page.goto(`/${testTenant}/${productSlug}`)

      // Should have product name
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // Should have price
      const priceVisible = await page.getByText(/\$|AUD|price/i).isVisible().catch(() => false)
      expect(priceVisible).toBeTruthy()
    })

    test('should have add to cart button', async ({ page }) => {
      await page.goto(`/${testTenant}/${productSlug}`)

      // Should have add to cart button
      const addButton = page.getByRole('button', { name: /add to cart|add to bag/i })
      await expect(addButton).toBeVisible()
    })
  })

  test.describe('Shopping Cart', () => {
    test('should display cart page', async ({ page }) => {
      await page.goto(`/${testTenant}/cart`)

      // Cart page should load
      await expect(page).toHaveURL(/\/cart/)

      // Should show cart content or empty message
      const hasCartItems = await page.locator('[data-testid="cart-item"]')
        .or(page.locator('.cart-item'))
        .first()
        .isVisible()
        .catch(() => false)

      const hasEmptyCart = await page.getByText(/cart is empty|no items|empty cart/i)
        .isVisible()
        .catch(() => false)

      expect(hasCartItems || hasEmptyCart).toBeTruthy()
    })

    test('should show cart total', async ({ page }) => {
      await page.goto(`/${testTenant}/cart`)

      // Wait for cart to load
      await page.waitForTimeout(1000)

      // Should show total or subtotal (even if $0 for empty cart)
      const hasTotalSection = await page.getByText(/total|subtotal/i).isVisible().catch(() => false)
      const hasEmptyCart = await page.getByText(/cart is empty/i).isVisible().catch(() => false)

      expect(hasTotalSection || hasEmptyCart).toBeTruthy()
    })
  })

  test.describe('Checkout Flow', () => {
    // These tests require a product to be in the cart
    // They test the checkout form itself (before Stripe redirect)

    test('should navigate to checkout from cart', async ({ page }) => {
      await page.goto(`/${testTenant}/cart`)

      // Wait for cart to load
      await page.waitForTimeout(1000)

      // Find checkout button
      const checkoutButton = page.getByRole('button', { name: /checkout|proceed/i })
        .or(page.getByRole('link', { name: /checkout|proceed/i }))

      // If cart is empty or no checkout button, skip
      if (!(await checkoutButton.isVisible())) {
        const isEmpty = await page.getByText(/cart is empty/i).isVisible().catch(() => false)
        test.skip(isEmpty, 'Cart is empty - add products first')
        return
      }

      // Click checkout
      await checkoutButton.click()

      // Should be on checkout page or redirect to Stripe
      await page.waitForTimeout(2000)

      const onCheckoutPage = page.url().includes('/checkout') || page.url().includes('stripe.com')
      expect(onCheckoutPage).toBeTruthy()
    })

    test('should display checkout form fields', async ({ page }) => {
      await page.goto(`/${testTenant}/checkout`)

      // Wait for page load
      await page.waitForTimeout(2000)

      // If redirected to cart (empty), skip
      if (page.url().includes('/cart')) {
        test.skip(true, 'Redirected to cart - need items to checkout')
        return
      }

      // Should have customer info fields
      const hasEmailField = await page.getByLabel(/email/i).isVisible().catch(() => false)
      const hasNameField = await page.getByLabel(/name/i).isVisible().catch(() => false)

      // Or if using Stripe Checkout, we get redirected there
      const onStripe = page.url().includes('stripe.com')

      expect(hasEmailField || hasNameField || onStripe).toBeTruthy()
    })

    test('should validate required checkout fields', async ({ page }) => {
      await page.goto(`/${testTenant}/checkout`)

      await page.waitForTimeout(2000)

      // Skip if redirected or on Stripe
      if (page.url().includes('/cart') || page.url().includes('stripe.com')) {
        test.skip(true, 'Not on checkout form')
        return
      }

      // Try to submit empty form
      const submitButton = page.getByRole('button', { name: /pay|place order|submit/i })

      if (await submitButton.isVisible()) {
        await submitButton.click()

        // Should show validation errors
        const hasError = await page.getByText(/required|invalid|enter/i).isVisible()
          .catch(() => true) // Form validation may prevent submission entirely

        expect(hasError).toBeTruthy()
      }
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should be usable on mobile', async ({ page }) => {
      await page.goto(`/${testTenant}`)

      // Page should load and be visible
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
      expect(bodyHeight).toBeGreaterThan(200)

      // Navigation should be accessible (possibly via hamburger menu)
      const nav = page.getByRole('navigation')
        .or(page.getByRole('button', { name: /menu/i }))

      await expect(nav.first()).toBeVisible()
    })

    test('cart should work on mobile', async ({ page }) => {
      await page.goto(`/${testTenant}/cart`)

      // Page should load
      await expect(page).not.toHaveTitle(/error/i)

      // Content should be visible
      const content = await page.locator('body').textContent()
      expect(content?.length).toBeGreaterThan(50)
    })
  })
})

test.describe('Error Handling', () => {
  test('should handle invalid tenant gracefully', async ({ page }) => {
    await page.goto('/nonexistent-tenant-12345')

    // Should show 404 or redirect
    const is404 = await page.getByText(/not found|404|doesn't exist/i).isVisible().catch(() => false)
    const wasRedirected = !page.url().includes('nonexistent-tenant-12345')

    expect(is404 || wasRedirected).toBeTruthy()
  })

  test('should handle invalid product gracefully', async ({ page }) => {
    await page.goto(`/${testTenant}/nonexistent-product-xyz123`)

    // Should show 404 or redirect
    const is404 = await page.getByText(/not found|404|doesn't exist/i).isVisible().catch(() => false)
    const wasRedirected = !page.url().includes('nonexistent-product-xyz123')

    expect(is404 || wasRedirected).toBeTruthy()
  })
})
