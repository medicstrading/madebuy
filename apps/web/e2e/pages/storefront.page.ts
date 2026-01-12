import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object for the Tenant Storefront homepage
 */
export class StorefrontPage {
  readonly page: Page
  readonly tenantSlug: string

  // Header elements
  readonly logo: Locator
  readonly searchInput: Locator
  readonly cartIcon: Locator
  readonly cartBadge: Locator
  readonly menuButton: Locator
  readonly navigation: Locator

  // Product listing
  readonly productGrid: Locator
  readonly productCards: Locator
  readonly categoryLinks: Locator
  readonly collectionLinks: Locator

  // Filters
  readonly sortDropdown: Locator
  readonly priceFilter: Locator
  readonly categoryFilter: Locator

  // Empty/Loading states
  readonly loadingSpinner: Locator
  readonly emptyState: Locator
  readonly errorState: Locator

  // Footer
  readonly footer: Locator
  readonly contactLink: Locator
  readonly socialLinks: Locator

  constructor(page: Page, tenantSlug: string) {
    this.page = page
    this.tenantSlug = tenantSlug

    // Header
    this.logo = page.locator('[data-testid="store-logo"]')
      .or(page.getByRole('link', { name: /home/i }).first())
    this.searchInput = page.getByPlaceholder(/search/i)
      .or(page.getByRole('searchbox'))
    this.cartIcon = page.getByRole('link', { name: /cart|bag/i })
      .or(page.locator('[data-testid="cart-icon"]'))
    this.cartBadge = page.locator('[data-testid="cart-badge"]')
      .or(page.locator('.cart-badge'))
    this.menuButton = page.getByRole('button', { name: /menu/i })
    this.navigation = page.getByRole('navigation')

    // Product listing
    this.productGrid = page.locator('[data-testid="product-grid"]')
      .or(page.locator('.product-grid'))
      .or(page.locator('main'))
    this.productCards = page.locator('[data-testid="product-card"]')
      .or(page.locator('.product-card'))
      .or(page.locator('article').filter({ has: page.locator('img') }))
    this.categoryLinks = page.getByRole('link').filter({ hasText: /category|collection/i })
    this.collectionLinks = page.locator('[data-testid="collection-link"]')

    // Filters
    this.sortDropdown = page.getByRole('combobox', { name: /sort/i })
      .or(page.locator('[data-testid="sort-dropdown"]'))
    this.priceFilter = page.locator('[data-testid="price-filter"]')
    this.categoryFilter = page.locator('[data-testid="category-filter"]')

    // States
    this.loadingSpinner = page.locator('[data-testid="loading"]')
      .or(page.getByRole('progressbar'))
    this.emptyState = page.getByText(/no products|coming soon|empty/i)
    this.errorState = page.getByText(/error|something went wrong/i)

    // Footer
    this.footer = page.getByRole('contentinfo').or(page.locator('footer'))
    this.contactLink = page.getByRole('link', { name: /contact/i })
    this.socialLinks = page.locator('[data-testid="social-links"]')
      .or(page.locator('footer').getByRole('link'))
  }

  /**
   * Navigate to the storefront homepage
   */
  async goto(): Promise<void> {
    await this.page.goto(`/${this.tenantSlug}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to a specific category
   */
  async gotoCategory(categorySlug: string): Promise<void> {
    await this.page.goto(`/${this.tenantSlug}/category/${categorySlug}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to a specific collection
   */
  async gotoCollection(collectionSlug: string): Promise<void> {
    await this.page.goto(`/${this.tenantSlug}/collection/${collectionSlug}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Check if storefront loaded successfully
   */
  async isLoaded(): Promise<boolean> {
    const hasContent = await this.page.locator('body').textContent()
    return (hasContent?.length ?? 0) > 100
  }

  /**
   * Get count of visible product cards
   */
  async getProductCount(): Promise<number> {
    await this.page.waitForTimeout(1000) // Allow products to load
    return this.productCards.count()
  }

  /**
   * Check if products are visible
   */
  async hasProducts(): Promise<boolean> {
    const count = await this.getProductCount()
    return count > 0
  }

  /**
   * Check if showing empty state
   */
  async isEmpty(): Promise<boolean> {
    return this.emptyState.isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Search for products
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.searchInput.press('Enter')
    await this.page.waitForTimeout(500)
  }

  /**
   * Click on a product card by index
   */
  async clickProductByIndex(index: number): Promise<void> {
    await this.productCards.nth(index).click()
  }

  /**
   * Click on a product by name
   */
  async clickProductByName(name: string): Promise<void> {
    const product = this.productCards.filter({ hasText: name }).first()
    await product.click()
  }

  /**
   * Get cart badge count
   */
  async getCartCount(): Promise<number> {
    const badge = await this.cartBadge.textContent().catch(() => '0')
    return parseInt(badge || '0', 10)
  }

  /**
   * Navigate to cart page
   */
  async goToCart(): Promise<void> {
    await this.cartIcon.click()
    await expect(this.page).toHaveURL(/\/cart/)
  }

  /**
   * Sort products by option
   */
  async sortBy(option: 'price-low' | 'price-high' | 'newest' | 'popular'): Promise<void> {
    if (await this.sortDropdown.isVisible()) {
      await this.sortDropdown.selectOption(option)
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Check if page has error
   */
  async hasError(): Promise<boolean> {
    return this.errorState.isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Wait for products to load
   */
  async waitForProducts(): Promise<void> {
    await this.page.waitForTimeout(1000)
    // Wait for either products or empty state
    await Promise.race([
      this.productCards.first().waitFor({ timeout: 10000 }).catch(() => {}),
      this.emptyState.waitFor({ timeout: 10000 }).catch(() => {}),
    ])
  }

  /**
   * Get product names from visible cards
   */
  async getProductNames(): Promise<string[]> {
    const names: string[] = []
    const count = await this.productCards.count()
    for (let i = 0; i < count; i++) {
      const name = await this.productCards.nth(i).locator('h2, h3, [class*="name"], [class*="title"]')
        .first()
        .textContent()
        .catch(() => null)
      if (name) names.push(name.trim())
    }
    return names
  }
}
