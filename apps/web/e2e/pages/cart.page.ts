import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object for the Shopping Cart page
 */
export class CartPage {
  readonly page: Page
  readonly tenantSlug: string

  // Cart header
  readonly pageTitle: Locator
  readonly itemCount: Locator

  // Cart items
  readonly cartItems: Locator
  readonly emptyState: Locator

  // Individual item locators (use within cartItems context)
  readonly itemName: Locator
  readonly itemPrice: Locator
  readonly itemQuantity: Locator
  readonly increaseQuantity: Locator
  readonly decreaseQuantity: Locator
  readonly removeButton: Locator
  readonly itemOptions: Locator

  // Totals
  readonly subtotal: Locator
  readonly shippingCost: Locator
  readonly discount: Locator
  readonly total: Locator

  // Actions
  readonly checkoutButton: Locator
  readonly continueShoppingLink: Locator
  readonly promoCodeInput: Locator
  readonly applyPromoButton: Locator
  readonly clearCartButton: Locator

  // Messages
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page, tenantSlug: string) {
    this.page = page
    this.tenantSlug = tenantSlug

    // Header
    this.pageTitle = page.getByRole('heading', { name: /cart|bag|basket/i })
    this.itemCount = page.locator('[data-testid="cart-item-count"]')
      .or(page.getByText(/\d+ items?/i))

    // Cart items
    this.cartItems = page.locator('[data-testid="cart-item"]')
      .or(page.locator('.cart-item'))
      .or(page.locator('[class*="cart-item"]'))
    this.emptyState = page.getByText(/cart is empty|no items|empty cart/i)

    // Item details (generic locators, use within item context)
    this.itemName = page.locator('[data-testid="item-name"]')
    this.itemPrice = page.locator('[data-testid="item-price"]')
    this.itemQuantity = page.locator('input[type="number"]')
    this.increaseQuantity = page.getByRole('button', { name: /\+|increase/i })
    this.decreaseQuantity = page.getByRole('button', { name: /-|decrease/i })
    this.removeButton = page.getByRole('button', { name: /remove|delete|×/i })
    this.itemOptions = page.locator('[data-testid="item-options"]')

    // Totals
    this.subtotal = page.getByText(/subtotal/i).locator('..')
      .or(page.locator('[data-testid="subtotal"]'))
    this.shippingCost = page.getByText(/shipping/i).locator('..')
      .or(page.locator('[data-testid="shipping"]'))
    this.discount = page.getByText(/discount/i).locator('..')
      .or(page.locator('[data-testid="discount"]'))
    this.total = page.getByText(/^total$/i).locator('..')
      .or(page.locator('[data-testid="total"]'))

    // Actions
    this.checkoutButton = page.getByRole('button', { name: /checkout|proceed/i })
      .or(page.getByRole('link', { name: /checkout|proceed/i }))
    this.continueShoppingLink = page.getByRole('link', { name: /continue shopping|keep shopping/i })
    this.promoCodeInput = page.getByPlaceholder(/promo|coupon|discount/i)
      .or(page.getByLabel(/promo|coupon/i))
    this.applyPromoButton = page.getByRole('button', { name: /apply/i })
    this.clearCartButton = page.getByRole('button', { name: /clear|empty/i })

    // Messages
    this.successMessage = page.getByText(/success|updated|applied/i)
      .or(page.locator('[role="status"]'))
    this.errorMessage = page.getByText(/error|invalid|expired/i)
      .or(page.locator('[role="alert"]'))
  }

  /**
   * Navigate to cart page
   */
  async goto(): Promise<void> {
    await this.page.goto(`/${this.tenantSlug}/cart`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Check if cart is empty
   */
  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible({ timeout: 3000 })
  }

  /**
   * Get number of items in cart
   */
  async getItemCount(): Promise<number> {
    const count = await this.cartItems.count()
    return count
  }

  /**
   * Get cart item by index
   */
  getItem(index: number): Locator {
    return this.cartItems.nth(index)
  }

  /**
   * Get item name by index
   */
  async getItemName(index: number): Promise<string | null> {
    const item = this.getItem(index)
    const name = item.locator('[data-testid="item-name"], h3, h4, [class*="name"]')
    return name.first().textContent()
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(index: number, quantity: number): Promise<void> {
    const item = this.getItem(index)
    const qtyInput = item.locator('input[type="number"]')
    await qtyInput.fill(quantity.toString())
    await qtyInput.press('Tab') // Trigger update
    await this.page.waitForTimeout(500) // Wait for update
  }

  /**
   * Increase item quantity
   */
  async increaseItemQuantity(index: number): Promise<void> {
    const item = this.getItem(index)
    const btn = item.getByRole('button', { name: /\+|increase/i })
    await btn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Decrease item quantity
   */
  async decreaseItemQuantity(index: number): Promise<void> {
    const item = this.getItem(index)
    const btn = item.getByRole('button', { name: /-|decrease/i })
    await btn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Remove item from cart
   */
  async removeItem(index: number): Promise<void> {
    const item = this.getItem(index)
    const btn = item.getByRole('button', { name: /remove|delete|×/i })
    await btn.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Apply a promo code
   */
  async applyPromoCode(code: string): Promise<void> {
    await this.promoCodeInput.fill(code)
    await this.applyPromoButton.click()
    await this.page.waitForTimeout(500)
  }

  /**
   * Check if promo was applied successfully
   */
  async isPromoApplied(): Promise<boolean> {
    return this.discount.isVisible({ timeout: 3000 })
  }

  /**
   * Get subtotal as number
   */
  async getSubtotal(): Promise<number | null> {
    const text = await this.subtotal.textContent()
    if (!text) return null
    const match = text.match(/[\d,.]+/)
    return match ? parseFloat(match[0].replace(',', '')) : null
  }

  /**
   * Get total as number
   */
  async getTotal(): Promise<number | null> {
    const text = await this.total.textContent()
    if (!text) return null
    const match = text.match(/[\d,.]+/)
    return match ? parseFloat(match[0].replace(',', '')) : null
  }

  /**
   * Proceed to checkout
   */
  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click()
  }

  /**
   * Continue shopping
   */
  async continueShopping(): Promise<void> {
    await this.continueShoppingLink.click()
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    if (await this.clearCartButton.isVisible()) {
      await this.clearCartButton.click()
      // Handle confirmation if needed
      const confirmBtn = this.page.getByRole('button', { name: /confirm|yes/i })
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click()
      }
    }
  }

  /**
   * Check if checkout button is enabled
   */
  async isCheckoutEnabled(): Promise<boolean> {
    return !await this.checkoutButton.isDisabled()
  }

  /**
   * Wait for cart to update
   */
  async waitForUpdate(): Promise<void> {
    await this.page.waitForTimeout(1000)
  }
}
