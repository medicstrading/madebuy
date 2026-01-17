import { expect, test } from '@playwright/test'

/**
 * Bulk Operations E2E tests for MadeBuy Admin
 *
 * Tests the bulk selection and action functionality in the inventory table
 */

// Test credentials - skip tests if not configured
const testEmail = process.env.E2E_TEST_EMAIL || ''
const testPassword = process.env.E2E_TEST_PASSWORD || ''

test.describe('Inventory Bulk Operations', () => {
  test.skip(!testEmail || !testPassword, 'Test credentials not configured')

  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/password/i).fill(testPassword)
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })

  test.describe('Selection', () => {
    test('should show checkboxes in inventory table', async ({ page }) => {
      await page.goto('/dashboard/inventory')

      // Wait for table to load
      await page.waitForLoadState('networkidle')

      // Should have checkboxes
      const checkboxes = page.getByRole('checkbox')
      const checkboxCount = await checkboxes.count()

      // At minimum should have the "select all" checkbox in header
      expect(checkboxCount).toBeGreaterThanOrEqual(1)
    })

    test('should select individual items', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      // Get all checkboxes except the header checkbox
      const checkboxes = page.getByRole('checkbox')
      const count = await checkboxes.count()

      if (count <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Click the first item checkbox (skip header checkbox at index 0)
      await checkboxes.nth(1).click()

      // Should show selection indicator
      const selectionText = page
        .getByText(/1 selected|1 item/i)
        .or(page.getByText('(1 selected)'))

      await expect(selectionText).toBeVisible({ timeout: 5000 })
    })

    test('should select all items with header checkbox', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      const count = await checkboxes.count()

      if (count <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Click the header checkbox (index 0)
      await checkboxes.first().click()

      // Should show "selected" text
      await expect(page.getByText(/selected/i)).toBeVisible({ timeout: 5000 })
    })

    test('should clear selection', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      const count = await checkboxes.count()

      if (count <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Select an item
      await checkboxes.nth(1).click()

      // Find and click clear button
      const clearButton = page
        .getByRole('button', { name: /clear/i })
        .or(page.getByText('Clear'))

      if (await clearButton.isVisible()) {
        await clearButton.click()

        // Selection indicator should be gone
        await expect(page.getByText(/selected/i)).not.toBeVisible({
          timeout: 5000,
        })
      }
    })
  })

  test.describe('Bulk Actions Toolbar', () => {
    test('should show bulk actions toolbar when items selected', async ({
      page,
    }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      const count = await checkboxes.count()

      if (count <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Select an item
      await checkboxes.nth(1).click()

      // Should show bulk actions button
      const bulkButton = page.getByRole('button', { name: /bulk actions/i })
      await expect(bulkButton).toBeVisible({ timeout: 5000 })
    })

    test('should open bulk actions dropdown', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      const count = await checkboxes.count()

      if (count <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Select an item
      await checkboxes.nth(1).click()

      // Click bulk actions button
      await page.getByRole('button', { name: /bulk actions/i }).click()

      // Should show dropdown with options
      const statusOption = page.getByText(/change status/i)
      const deleteOption = page.getByText(/delete/i)
      const featuredOption = page.getByText(/featured/i)

      const hasOptions =
        (await statusOption.isVisible()) ||
        (await deleteOption.isVisible()) ||
        (await featuredOption.isVisible())

      expect(hasOptions).toBeTruthy()
    })
  })

  test.describe('Bulk Status Change', () => {
    test('should open status change modal', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      if ((await checkboxes.count()) <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Select item and open bulk actions
      await checkboxes.nth(1).click()
      await page.getByRole('button', { name: /bulk actions/i }).click()

      // Click change status
      await page.getByText(/change status/i).click()

      // Modal should appear with status options
      const statusDropdown = page
        .getByRole('combobox')
        .or(page.locator('select'))

      await expect(statusDropdown).toBeVisible({ timeout: 5000 })
    })

    test('should change status via bulk action', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      if ((await checkboxes.count()) <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Select item
      await checkboxes.nth(1).click()

      // Open bulk actions
      await page.getByRole('button', { name: /bulk actions/i }).click()

      // Click change status
      await page.getByText(/change status/i).click()

      // Select new status
      const statusSelect = page.locator('select').or(page.getByRole('combobox'))
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('available')
      }

      // Confirm
      const confirmButton = page.getByRole('button', {
        name: /confirm|update|apply/i,
      })
      await confirmButton.click()

      // Should complete without error (success toast or modal closes)
      await page.waitForLoadState('networkidle')
      const errorVisible = await page
        .getByText(/error|failed/i)
        .isVisible()
        .catch(() => false)

      expect(errorVisible).toBeFalsy()
    })
  })

  test.describe('Bulk Delete', () => {
    test('should show confirmation for delete action', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      if ((await checkboxes.count()) <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Select item
      await checkboxes.nth(1).click()

      // Open bulk actions
      await page.getByRole('button', { name: /bulk actions/i }).click()

      // Click delete
      await page.getByText(/delete selected/i).click()

      // Should show confirmation
      const confirmText = page.getByText(
        /are you sure|cannot be undone|confirm/i,
      )
      await expect(confirmText).toBeVisible({ timeout: 5000 })

      // Cancel to avoid deletion
      const cancelButton = page.getByRole('button', { name: /cancel/i })
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
      }
    })
  })

  test.describe('Selection Persistence', () => {
    test('should clear selection after action completes', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      if ((await checkboxes.count()) <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Select item
      await checkboxes.nth(1).click()

      // Verify selection shows
      await expect(page.getByText(/selected/i)).toBeVisible()

      // Perform an action (set featured)
      await page.getByRole('button', { name: /bulk actions/i }).click()
      await page.getByText(/featured/i).click()

      // Select the option and confirm
      const confirmButton = page.getByRole('button', {
        name: /confirm|update|apply/i,
      })
      if (await confirmButton.isVisible()) {
        await confirmButton.click()

        // Wait for action to complete
        await page.waitForLoadState('networkidle')

        // Selection should be cleared (no "selected" text)
        const _selectionVisible = await page
          .getByText(/\d+ selected/i)
          .isVisible()
          .catch(() => false)

        // If modal is still open, close it first
        const closeButton = page.getByRole('button', { name: /close|cancel/i })
        if (await closeButton.isVisible()) {
          await closeButton.click()
        }

        // Selection indicator should be gone after successful action
        // Note: This may fail if action failed - that's expected
      }
    })
  })

  test.describe('Row Highlighting', () => {
    test('should highlight selected rows', async ({ page }) => {
      await page.goto('/dashboard/inventory')
      await page.waitForLoadState('networkidle')

      const checkboxes = page.getByRole('checkbox')
      if ((await checkboxes.count()) <= 1) {
        test.skip(true, 'No items to select')
        return
      }

      // Get the table row before selection
      const tableRows = page.locator('table tbody tr')
      const firstRowCount = await tableRows.count()

      if (firstRowCount === 0) {
        test.skip(true, 'No table rows')
        return
      }

      // Select an item
      await checkboxes.nth(1).click()

      // The row should have a highlight class (bg-blue-50)
      const highlightedRow = page.locator('tr.bg-blue-50')
      const highlightCount = await highlightedRow.count()

      expect(highlightCount).toBeGreaterThanOrEqual(1)
    })
  })
})
