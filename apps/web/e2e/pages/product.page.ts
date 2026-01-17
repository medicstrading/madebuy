import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Page Object for Product Detail pages
 */
export class ProductPage {
  readonly page: Page
  readonly tenantSlug: string

  // Product info
  readonly productTitle: Locator
  readonly productPrice: Locator
  readonly productDescription: Locator
  readonly productImages: Locator
  readonly mainImage: Locator
  readonly thumbnails: Locator

  // Options/Variants
  readonly variantSelectors: Locator
  readonly sizeSelector: Locator
  readonly colorSelector: Locator
  readonly customOptionInputs: Locator

  // Purchase actions
  readonly quantityInput: Locator
  readonly increaseQuantity: Locator
  readonly decreaseQuantity: Locator
  readonly addToCartButton: Locator
  readonly buyNowButton: Locator

  // Status indicators
  readonly stockStatus: Locator
  readonly soldOutBadge: Locator
  readonly lowStockWarning: Locator

  // Reviews
  readonly reviewSection: Locator
  readonly averageRating: Locator
  readonly reviewCount: Locator
  readonly reviews: Locator

  // Related products
  readonly relatedProducts: Locator

  // Messages
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page, tenantSlug: string) {
    this.page = page
    this.tenantSlug = tenantSlug

    // Product info
    this.productTitle = page.getByRole('heading', { level: 1 })
    this.productPrice = page
      .locator('[data-testid="product-price"]')
      .or(page.getByText(/\$\d+|\d+\s*AUD/))
    this.productDescription = page
      .locator('[data-testid="product-description"]')
      .or(page.locator('.product-description'))
    this.productImages = page
      .locator('[data-testid="product-images"]')
      .or(page.locator('.product-images'))
    this.mainImage = page
      .locator('[data-testid="main-image"]')
      .or(page.locator('img[alt]').first())
    this.thumbnails = page
      .locator('[data-testid="thumbnail"]')
      .or(page.locator('.thumbnail'))

    // Options/Variants
    this.variantSelectors = page.locator('[data-testid="variant-selector"]')
    this.sizeSelector = page
      .getByLabel(/size/i)
      .or(page.locator('[data-testid="size-selector"]'))
    this.colorSelector = page
      .getByLabel(/color|colour/i)
      .or(page.locator('[data-testid="color-selector"]'))
    this.customOptionInputs = page.locator('[data-testid="custom-option"]')

    // Purchase actions
    this.quantityInput = page
      .getByLabel(/quantity|qty/i)
      .or(page.locator('input[type="number"]'))
    this.increaseQuantity = page.getByRole('button', { name: /\+|increase/i })
    this.decreaseQuantity = page.getByRole('button', { name: /-|decrease/i })
    this.addToCartButton = page.getByRole('button', {
      name: /add to cart|add to bag/i,
    })
    this.buyNowButton = page.getByRole('button', { name: /buy now/i })

    // Status
    this.stockStatus = page.locator('[data-testid="stock-status"]')
    this.soldOutBadge = page.getByText(/sold out|out of stock/i)
    this.lowStockWarning = page.getByText(/only \d+ left|low stock/i)

    // Reviews
    this.reviewSection = page
      .locator('[data-testid="reviews"]')
      .or(page.getByText(/reviews/i).locator('..'))
    this.averageRating = page.locator('[data-testid="average-rating"]')
    this.reviewCount = page.locator('[data-testid="review-count"]')
    this.reviews = page.locator('[data-testid="review"]')

    // Related
    this.relatedProducts = page
      .locator('[data-testid="related-products"]')
      .or(page.getByText(/you may also like|related/i).locator('..'))

    // Messages
    this.successMessage = page
      .getByText(/added to cart|success/i)
      .or(page.locator('[role="status"]'))
    this.errorMessage = page
      .getByText(/error|failed|unable/i)
      .or(page.locator('[role="alert"]'))
  }

  /**
   * Navigate to a product page
   */
  async goto(productSlug: string): Promise<void> {
    await this.page.goto(`/${this.tenantSlug}/${productSlug}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Check if product page loaded
   */
  async isLoaded(): Promise<boolean> {
    return this.productTitle.isVisible({ timeout: 5000 })
  }

  /**
   * Get the product title
   */
  async getTitle(): Promise<string | null> {
    return this.productTitle.textContent()
  }

  /**
   * Get the product price as number
   */
  async getPrice(): Promise<number | null> {
    const priceText = await this.productPrice.textContent()
    if (!priceText) return null
    const match = priceText.match(/[\d,.]+/)
    return match ? parseFloat(match[0].replace(',', '')) : null
  }

  /**
   * Check if product is sold out
   */
  async isSoldOut(): Promise<boolean> {
    return this.soldOutBadge.isVisible({ timeout: 2000 }).catch(() => false)
  }

  /**
   * Check if add to cart is disabled
   */
  async isAddToCartDisabled(): Promise<boolean> {
    return this.addToCartButton.isDisabled()
  }

  /**
   * Set quantity
   */
  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(quantity.toString())
  }

  /**
   * Increase quantity by clicking button
   */
  async increaseQty(): Promise<void> {
    await this.increaseQuantity.click()
  }

  /**
   * Decrease quantity by clicking button
   */
  async decreaseQty(): Promise<void> {
    await this.decreaseQuantity.click()
  }

  /**
   * Select a size variant
   */
  async selectSize(size: string): Promise<void> {
    if (await this.sizeSelector.isVisible()) {
      try {
        await this.sizeSelector.selectOption(size)
      } catch {
        // Handle button-style selectors
        await this.page.getByRole('button', { name: size }).click()
      }
    }
  }

  /**
   * Select a color variant
   */
  async selectColor(color: string): Promise<void> {
    if (await this.colorSelector.isVisible()) {
      try {
        await this.colorSelector.selectOption(color)
      } catch {
        // Handle swatch-style selectors
        await this.page
          .locator(`[data-color="${color}"], [title="${color}"]`)
          .click()
      }
    }
  }

  /**
   * Add product to cart
   */
  async addToCart(): Promise<void> {
    await this.addToCartButton.click()
  }

  /**
   * Add to cart and wait for confirmation
   */
  async addToCartAndWait(): Promise<void> {
    await this.addToCart()
    await this.waitForAddToCartSuccess()
  }

  /**
   * Click buy now button
   */
  async buyNow(): Promise<void> {
    await this.buyNowButton.click()
  }

  /**
   * Wait for add to cart success message
   */
  async waitForAddToCartSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible({ timeout: 5000 })
  }

  /**
   * Check if add to cart was successful
   */
  async wasAddedToCart(): Promise<boolean> {
    return this.successMessage.isVisible({ timeout: 5000 }).catch(() => false)
  }

  /**
   * Check if there was an error
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Click on a thumbnail to change main image
   */
  async clickThumbnail(index: number): Promise<void> {
    await this.thumbnails.nth(index).click()
  }

  /**
   * Get review count
   */
  async getReviewCount(): Promise<number> {
    const countText = await this.reviewCount.textContent().catch(() => '0')
    const match = countText?.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  /**
   * Navigate to related product
   */
  async clickRelatedProduct(index: number): Promise<void> {
    const relatedCards = this.relatedProducts.locator(
      '[data-testid="product-card"], article',
    )
    await relatedCards.nth(index).click()
  }
}
