import { Page, Locator, expect } from '@playwright/test'
import { TestMaterial } from '../fixtures'

/**
 * Page Object for the Materials pages
 */
export class MaterialsPage {
  readonly page: Page

  // List page
  readonly pageTitle: Locator
  readonly createButton: Locator
  readonly searchInput: Locator
  readonly categoryFilter: Locator
  readonly materialRows: Locator
  readonly emptyState: Locator

  // Create/Edit form
  readonly nameInput: Locator
  readonly descriptionInput: Locator
  readonly categoryInput: Locator
  readonly unitInput: Locator
  readonly quantityInput: Locator
  readonly costInput: Locator
  readonly supplierInput: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator
  readonly deleteButton: Locator

  // Stock tracking
  readonly addStockButton: Locator
  readonly removeStockButton: Locator
  readonly stockAdjustmentInput: Locator

  // Confirmation dialog
  readonly confirmDialog: Locator
  readonly confirmButton: Locator
  readonly cancelDialogButton: Locator

  constructor(page: Page) {
    this.page = page

    // List page
    this.pageTitle = page.getByRole('heading', { name: /materials|supplies|inventory/i })
    this.createButton = page.getByRole('link', { name: /add|create|new/i })
      .or(page.getByRole('button', { name: /add|create|new/i }))
    this.searchInput = page.getByPlaceholder(/search/i)
    this.categoryFilter = page.getByRole('combobox', { name: /category|filter/i })
    this.materialRows = page.locator('table tbody tr')
      .or(page.locator('[data-testid="material-row"]'))
    this.emptyState = page.getByText(/no materials|no supplies|empty|get started/i)

    // Create/Edit form
    this.nameInput = page.getByLabel(/name|material name/i)
    this.descriptionInput = page.getByLabel(/description|notes/i)
    this.categoryInput = page.getByLabel(/category/i)
    this.unitInput = page.getByLabel(/unit/i)
    this.quantityInput = page.getByLabel(/quantity|stock/i)
    this.costInput = page.getByLabel(/cost|price/i)
    this.supplierInput = page.getByLabel(/supplier/i)
    this.saveButton = page.getByRole('button', { name: /save|create|update/i })
    this.cancelButton = page.getByRole('button', { name: /cancel/i })
    this.deleteButton = page.getByRole('button', { name: /delete|remove/i })

    // Stock tracking
    this.addStockButton = page.getByRole('button', { name: /add stock|\+/i })
    this.removeStockButton = page.getByRole('button', { name: /remove stock|-/i })
    this.stockAdjustmentInput = page.getByLabel(/adjustment|amount/i)

    // Confirmation dialog
    this.confirmDialog = page.getByRole('dialog')
    this.confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i })
    this.cancelDialogButton = page.getByRole('button', { name: /cancel|no/i })
  }

  /**
   * Navigate to materials list page
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard/materials')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to create new material page
   */
  async gotoCreate(): Promise<void> {
    await this.page.goto('/dashboard/materials/new')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to edit a specific material
   */
  async gotoEdit(materialId: string): Promise<void> {
    await this.page.goto(`/dashboard/materials/${materialId}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Click the create button from list page
   */
  async clickCreate(): Promise<void> {
    await this.createButton.click()
    await expect(this.page).toHaveURL(/\/materials\/(new|create)/)
  }

  /**
   * Search for a material
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500)
  }

  /**
   * Get count of materials in list
   */
  async getMaterialCount(): Promise<number> {
    return this.materialRows.count()
  }

  /**
   * Check if material list is empty
   */
  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Fill the material form with test data
   */
  async fillMaterialForm(material: Partial<TestMaterial>): Promise<void> {
    if (material.name) {
      await this.nameInput.fill(material.name)
    }
    if (material.description && await this.descriptionInput.isVisible()) {
      await this.descriptionInput.fill(material.description)
    }
    if (material.category && await this.categoryInput.isVisible()) {
      try {
        await this.categoryInput.selectOption({ label: material.category })
      } catch {
        await this.categoryInput.fill(material.category)
      }
    }
    if (material.unit && await this.unitInput.isVisible()) {
      await this.unitInput.fill(material.unit)
    }
    if (material.quantity !== undefined && await this.quantityInput.isVisible()) {
      await this.quantityInput.fill(material.quantity.toString())
    }
    if (material.costPerUnit !== undefined && await this.costInput.isVisible()) {
      await this.costInput.fill(material.costPerUnit.toString())
    }
    if (material.supplier && await this.supplierInput.isVisible()) {
      await this.supplierInput.fill(material.supplier)
    }
  }

  /**
   * Submit the material form
   */
  async submitForm(): Promise<void> {
    await this.saveButton.click()
  }

  /**
   * Create a new material
   */
  async createMaterial(material: Partial<TestMaterial>): Promise<void> {
    await this.gotoCreate()
    await this.fillMaterialForm(material)
    await this.submitForm()
    await expect(this.page).not.toHaveURL(/\/(new|create)/, { timeout: 10000 })
  }

  /**
   * Click on a material in the list to edit it
   */
  async clickMaterialByName(name: string): Promise<void> {
    const materialLink = this.page.getByRole('link', { name: new RegExp(name, 'i') })
      .or(this.page.getByText(name))
    await materialLink.first().click()
  }

  /**
   * Delete the current material
   */
  async deleteCurrentMaterial(): Promise<void> {
    await this.deleteButton.click()
    await expect(this.confirmDialog).toBeVisible()
    await this.confirmButton.click()
    await expect(this.page).toHaveURL(/\/materials$/, { timeout: 10000 })
  }

  /**
   * Adjust stock level
   */
  async adjustStock(amount: number, type: 'add' | 'remove'): Promise<void> {
    if (await this.stockAdjustmentInput.isVisible()) {
      await this.stockAdjustmentInput.fill(Math.abs(amount).toString())
    }

    if (type === 'add') {
      await this.addStockButton.click()
    } else {
      await this.removeStockButton.click()
    }
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
   * Wait for materials to load
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(1000)
  }
}
