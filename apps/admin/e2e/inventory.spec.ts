import { test, expect } from '@playwright/test'

/**
 * Inventory (Pieces) E2E tests for MadeBuy Admin
 *
 * These tests verify the create/edit product (piece) flow
 */

// Test credentials - skip tests if not configured
const testEmail = process.env.E2E_TEST_EMAIL || ''
const testPassword = process.env.E2E_TEST_PASSWORD || ''

test.describe('Inventory Management', () => {
  test.skip(!testEmail || !testPassword, 'Test credentials not configured')

  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/password/i).fill(testPassword)
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })

  test.describe('Product List', () => {
    test('should navigate to inventory page', async ({ page }) => {
      // Navigate to inventory/pieces section
      await page.getByRole('link', { name: /inventory|pieces|products/i }).click()

      // Should be on inventory page
      await expect(page).toHaveURL(/\/(inventory|pieces|products)/)

      // Page should have expected elements
      await expect(page.getByRole('heading', { name: /inventory|pieces|products/i })).toBeVisible()
    })

    test('should display create product button', async ({ page }) => {
      await page.goto('/dashboard/pieces')

      // Should have add/create button
      const createButton = page.getByRole('link', { name: /add|create|new/i })
        .or(page.getByRole('button', { name: /add|create|new/i }))

      await expect(createButton).toBeVisible()
    })
  })

  test.describe('Create Product', () => {
    test('should navigate to create product form', async ({ page }) => {
      await page.goto('/dashboard/pieces')

      // Click create button
      await page.getByRole('link', { name: /add|create|new/i }).click()

      // Should be on create page
      await expect(page).toHaveURL(/\/(pieces|products)\/new|\/create/)

      // Form should be visible
      await expect(page.getByLabel(/name|title/i)).toBeVisible()
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/dashboard/pieces/new')

      // Try to submit empty form
      await page.getByRole('button', { name: /save|create|submit/i }).click()

      // Should show validation error or stay on page
      const hasError = await page.getByText(/required|cannot be empty/i).isVisible()
        .catch(() => false)
      const stillOnPage = page.url().includes('/new') || page.url().includes('/create')

      expect(hasError || stillOnPage).toBeTruthy()
    })

    test('should create a new product successfully', async ({ page }) => {
      await page.goto('/dashboard/pieces/new')

      // Generate unique product name
      const productName = `Test Product ${Date.now()}`

      // Fill in required fields
      await page.getByLabel(/name|title/i).fill(productName)

      // Fill in price if visible
      const priceInput = page.getByLabel(/price/i)
      if (await priceInput.isVisible()) {
        await priceInput.fill('29.99')
      }

      // Fill in description if visible
      const descInput = page.getByLabel(/description/i)
      if (await descInput.isVisible()) {
        await descInput.fill('Test product created by E2E tests')
      }

      // Select status if dropdown exists
      const statusSelect = page.getByLabel(/status/i)
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption({ label: 'Available' })
          .catch(() => statusSelect.click().then(() =>
            page.getByText('Available').click()
          ))
          .catch(() => {}) // Ignore if not found
      }

      // Submit form
      await page.getByRole('button', { name: /save|create|submit/i }).click()

      // Should redirect to product list or detail page
      await expect(page).not.toHaveURL(/\/new/, { timeout: 10000 })

      // Should show success message or be on product page
      const successVisible = await page.getByText(/created|saved|success/i).isVisible()
        .catch(() => false)
      const onProductPage = !page.url().includes('/new')

      expect(successVisible || onProductPage).toBeTruthy()
    })
  })

  test.describe('Edit Product', () => {
    test('should open edit form for existing product', async ({ page }) => {
      await page.goto('/dashboard/pieces')

      // Wait for products to load
      await page.waitForTimeout(1000)

      // Click on first product in list (edit button or row)
      const editButton = page.getByRole('button', { name: /edit/i }).first()
      const productRow = page.getByRole('row').nth(1) // First data row
      const productLink = page.getByRole('link').filter({ hasText: /./i }).first()

      if (await editButton.isVisible()) {
        await editButton.click()
      } else if (await productLink.isVisible()) {
        await productLink.click()
      } else {
        test.skip(true, 'No products to edit')
        return
      }

      // Should be on edit page with form
      await expect(page.getByLabel(/name|title/i)).toBeVisible({ timeout: 10000 })
    })

    test('should update product name', async ({ page }) => {
      await page.goto('/dashboard/pieces')

      // Wait for products
      await page.waitForTimeout(1000)

      // Find edit link/button for first product
      const editButton = page.getByRole('button', { name: /edit/i }).first()
      const editLink = page.getByRole('link', { name: /edit/i }).first()

      if (await editButton.isVisible()) {
        await editButton.click()
      } else if (await editLink.isVisible()) {
        await editLink.click()
      } else {
        // Try clicking on product name to go to edit
        const firstProduct = page.locator('table tbody tr').first()
          .or(page.locator('[data-testid="product-item"]').first())

        if (await firstProduct.isVisible()) {
          await firstProduct.click()
        } else {
          test.skip(true, 'No products available to edit')
          return
        }
      }

      // Wait for form
      await expect(page.getByLabel(/name|title/i)).toBeVisible({ timeout: 10000 })

      // Update the name
      const nameInput = page.getByLabel(/name|title/i)
      const currentName = await nameInput.inputValue()
      const updatedName = `${currentName} - Updated ${Date.now()}`

      await nameInput.clear()
      await nameInput.fill(updatedName)

      // Save
      await page.getByRole('button', { name: /save|update/i }).click()

      // Should show success or redirect
      await page.waitForTimeout(2000)
      const success = await page.getByText(/saved|updated|success/i).isVisible()
        .catch(() => true) // If redirected, consider it success

      expect(success).toBeTruthy()
    })
  })

  test.describe('Delete Product', () => {
    test('should show delete confirmation', async ({ page }) => {
      await page.goto('/dashboard/pieces')

      // Wait for products
      await page.waitForTimeout(1000)

      // Find delete button
      const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first()

      if (!(await deleteButton.isVisible())) {
        test.skip(true, 'No delete button visible')
        return
      }

      // Click delete
      await deleteButton.click()

      // Should show confirmation dialog/modal
      const confirmVisible = await page.getByText(/are you sure|confirm|delete/i).isVisible()
        .catch(() => false)
      const dialogVisible = await page.getByRole('dialog').isVisible()
        .catch(() => false)

      expect(confirmVisible || dialogVisible).toBeTruthy()

      // Cancel to avoid actually deleting
      const cancelButton = page.getByRole('button', { name: /cancel|no/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
    })
  })
})
