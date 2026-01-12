import { Page, Locator, expect } from '@playwright/test'
import { TestProduct } from '../fixtures'

/**
 * Page Object for the Pieces (Products/Inventory) pages
 */
export class PiecesPage {
  readonly page: Page

  // List page
  readonly pageTitle: Locator
  readonly createButton: Locator
  readonly searchInput: Locator
  readonly filterDropdown: Locator
  readonly productRows: Locator
  readonly productCards: Locator
  readonly emptyState: Locator
  readonly bulkSelectAll: Locator
  readonly bulkActionsMenu: Locator

  // Create/Edit form
  readonly nameInput: Locator
  readonly descriptionInput: Locator
  readonly priceInput: Locator
  readonly statusSelect: Locator
  readonly quantityInput: Locator
  readonly categoryInput: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator
  readonly deleteButton: Locator

  // Media upload
  readonly mediaDropzone: Locator
  readonly mediaUploadButton: Locator
  readonly uploadedImages: Locator

  // Confirmation dialog
  readonly confirmDialog: Locator
  readonly confirmButton: Locator
  readonly cancelDialogButton: Locator

  constructor(page: Page) {
    this.page = page

    // List page
    this.pageTitle = page.getByRole('heading', { name: /inventory|pieces|products/i })
    this.createButton = page.getByRole('link', { name: /add|create|new/i })
      .or(page.getByRole('button', { name: /add|create|new/i }))
    this.searchInput = page.getByPlaceholder(/search/i)
      .or(page.getByRole('searchbox'))
    this.filterDropdown = page.getByRole('combobox', { name: /filter|status/i })
      .or(page.locator('[data-testid="filter-dropdown"]'))
    this.productRows = page.locator('table tbody tr')
      .or(page.locator('[data-testid="product-row"]'))
    this.productCards = page.locator('[data-testid="product-card"]')
      .or(page.locator('.product-card'))
    this.emptyState = page.getByText(/no products|no pieces|empty|get started/i)
    this.bulkSelectAll = page.getByRole('checkbox', { name: /select all/i })
      .or(page.locator('thead input[type="checkbox"]'))
    this.bulkActionsMenu = page.getByRole('button', { name: /bulk|actions/i })
      .or(page.locator('[data-testid="bulk-actions"]'))

    // Create/Edit form
    this.nameInput = page.getByLabel(/name|title/i)
    this.descriptionInput = page.getByLabel(/description/i)
      .or(page.locator('textarea').first())
    this.priceInput = page.getByLabel(/price/i)
    this.statusSelect = page.getByLabel(/status/i)
      .or(page.locator('[data-testid="status-select"]'))
    this.quantityInput = page.getByLabel(/quantity|stock/i)
    this.categoryInput = page.getByLabel(/category/i)
    this.saveButton = page.getByRole('button', { name: /save|create|update/i })
    this.cancelButton = page.getByRole('button', { name: /cancel/i })
      .or(page.getByRole('link', { name: /cancel|back/i }))
    this.deleteButton = page.getByRole('button', { name: /delete|remove/i })

    // Media upload
    this.mediaDropzone = page.locator('[data-testid="media-dropzone"]')
      .or(page.getByText(/drag|drop|upload/i).locator('..'))
    this.mediaUploadButton = page.getByRole('button', { name: /upload|add image/i })
    this.uploadedImages = page.locator('[data-testid="uploaded-image"]')
      .or(page.locator('.uploaded-image'))

    // Confirmation dialog
    this.confirmDialog = page.getByRole('dialog')
      .or(page.locator('[data-testid="confirm-dialog"]'))
    this.confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i })
    this.cancelDialogButton = page.getByRole('button', { name: /cancel|no/i })
  }

  /**
   * Navigate to pieces list page
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard/pieces')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to create new piece page
   */
  async gotoCreate(): Promise<void> {
    await this.page.goto('/dashboard/pieces/new')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to edit a specific piece
   */
  async gotoEdit(pieceId: string): Promise<void> {
    await this.page.goto(`/dashboard/pieces/${pieceId}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Click the create button from list page
   */
  async clickCreate(): Promise<void> {
    await this.createButton.click()
    await expect(this.page).toHaveURL(/\/(pieces|products)\/(new|create)/)
  }

  /**
   * Search for a product
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Debounce
  }

  /**
   * Get count of products in list
   */
  async getProductCount(): Promise<number> {
    const rows = await this.productRows.count()
    const cards = await this.productCards.count()
    return Math.max(rows, cards)
  }

  /**
   * Check if product list is empty
   */
  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Fill the product form with test data
   */
  async fillProductForm(product: Partial<TestProduct>): Promise<void> {
    if (product.name) {
      await this.nameInput.fill(product.name)
    }
    if (product.description && await this.descriptionInput.isVisible()) {
      await this.descriptionInput.fill(product.description)
    }
    if (product.price !== undefined && await this.priceInput.isVisible()) {
      await this.priceInput.fill(product.price.toString())
    }
    if (product.quantity !== undefined && await this.quantityInput.isVisible()) {
      await this.quantityInput.fill(product.quantity.toString())
    }
    if (product.status && await this.statusSelect.isVisible()) {
      // Handle both native select and custom dropdown
      try {
        await this.statusSelect.selectOption({ label: product.status })
      } catch {
        await this.statusSelect.click()
        await this.page.getByText(new RegExp(product.status, 'i')).click()
      }
    }
  }

  /**
   * Submit the product form
   */
  async submitForm(): Promise<void> {
    await this.saveButton.click()
  }

  /**
   * Create a new product
   */
  async createProduct(product: Partial<TestProduct>): Promise<void> {
    await this.gotoCreate()
    await this.fillProductForm(product)
    await this.submitForm()
    // Wait for redirect away from create page
    await expect(this.page).not.toHaveURL(/\/(new|create)/, { timeout: 10000 })
  }

  /**
   * Click on a product in the list to edit it
   */
  async clickProductByName(name: string): Promise<void> {
    const productLink = this.page.getByRole('link', { name: new RegExp(name, 'i') })
      .or(this.page.getByText(name))
    await productLink.first().click()
  }

  /**
   * Click edit button for first product in list
   */
  async clickEditFirstProduct(): Promise<void> {
    const editButton = this.page.getByRole('button', { name: /edit/i }).first()
    const editLink = this.page.getByRole('link', { name: /edit/i }).first()

    if (await editButton.isVisible()) {
      await editButton.click()
    } else if (await editLink.isVisible()) {
      await editLink.click()
    } else {
      // Click on the first row to go to edit
      await this.productRows.first().click()
    }

    await expect(this.nameInput).toBeVisible({ timeout: 10000 })
  }

  /**
   * Delete the current product
   */
  async deleteCurrentProduct(): Promise<void> {
    await this.deleteButton.click()
    await expect(this.confirmDialog).toBeVisible()
    await this.confirmButton.click()
    await expect(this.page).toHaveURL(/\/(pieces|products)$/, { timeout: 10000 })
  }

  /**
   * Cancel delete confirmation
   */
  async cancelDelete(): Promise<void> {
    await this.cancelDialogButton.click()
    await expect(this.confirmDialog).not.toBeVisible()
  }

  /**
   * Select multiple products for bulk action
   */
  async selectProducts(indices: number[]): Promise<void> {
    for (const index of indices) {
      const checkbox = this.productRows.nth(index).getByRole('checkbox')
      await checkbox.check()
    }
  }

  /**
   * Select all products
   */
  async selectAll(): Promise<void> {
    await this.bulkSelectAll.check()
  }

  /**
   * Get success message if visible
   */
  async getSuccessMessage(): Promise<string | null> {
    const toast = this.page.getByText(/success|saved|created|updated/i)
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      return toast.textContent()
    }
    return null
  }

  /**
   * Get error message if visible
   */
  async getErrorMessage(): Promise<string | null> {
    const toast = this.page.getByText(/error|failed|invalid/i)
      .or(this.page.locator('[role="alert"]'))
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      return toast.textContent()
    }
    return null
  }

  /**
   * Wait for products to load
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(1000) // Allow for dynamic content
  }
}
