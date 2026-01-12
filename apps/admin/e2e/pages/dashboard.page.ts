import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object for the Admin Dashboard
 */
export class DashboardPage {
  readonly page: Page

  // Navigation
  readonly sidebarNav: Locator
  readonly inventoryLink: Locator
  readonly materialsLink: Locator
  readonly ordersLink: Locator
  readonly customersLink: Locator
  readonly socialLink: Locator
  readonly settingsLink: Locator
  readonly analyticsLink: Locator

  // Header
  readonly userMenu: Locator
  readonly logoutButton: Locator
  readonly notificationsButton: Locator

  // Dashboard content
  readonly statsCards: Locator
  readonly recentOrders: Locator
  readonly quickActions: Locator

  constructor(page: Page) {
    this.page = page

    // Navigation
    this.sidebarNav = page.getByRole('navigation').or(page.locator('[data-testid="sidebar"]'))
    this.inventoryLink = page.getByRole('link', { name: /inventory|pieces|products/i })
    this.materialsLink = page.getByRole('link', { name: /materials|supplies/i })
    this.ordersLink = page.getByRole('link', { name: /orders/i })
    this.customersLink = page.getByRole('link', { name: /customers/i })
    this.socialLink = page.getByRole('link', { name: /social|publish/i })
    this.settingsLink = page.getByRole('link', { name: /settings/i })
    this.analyticsLink = page.getByRole('link', { name: /analytics|reports/i })

    // Header
    this.userMenu = page.getByRole('button', { name: /account|profile|menu/i })
      .or(page.locator('[data-testid="user-menu"]'))
    this.logoutButton = page.getByRole('button', { name: /logout|sign out/i })
      .or(page.getByText(/logout|sign out/i))
    this.notificationsButton = page.getByRole('button', { name: /notifications/i })
      .or(page.locator('[data-testid="notifications"]'))

    // Dashboard content
    this.statsCards = page.locator('[data-testid="stats-card"]')
      .or(page.locator('.stats-card'))
      .or(page.locator('[class*="stat"]'))
    this.recentOrders = page.locator('[data-testid="recent-orders"]')
      .or(page.getByText(/recent orders/i).locator('..'))
    this.quickActions = page.locator('[data-testid="quick-actions"]')
      .or(page.getByText(/quick actions/i).locator('..'))
  }

  /**
   * Navigate to dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Check if on dashboard page
   */
  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard')
  }

  /**
   * Navigate to inventory/pieces page
   */
  async navigateToInventory(): Promise<void> {
    await this.inventoryLink.click()
    await expect(this.page).toHaveURL(/\/(inventory|pieces|products)/)
  }

  /**
   * Navigate to materials page
   */
  async navigateToMaterials(): Promise<void> {
    await this.materialsLink.click()
    await expect(this.page).toHaveURL(/\/materials/)
  }

  /**
   * Navigate to orders page
   */
  async navigateToOrders(): Promise<void> {
    await this.ordersLink.click()
    await expect(this.page).toHaveURL(/\/orders/)
  }

  /**
   * Navigate to customers page
   */
  async navigateToCustomers(): Promise<void> {
    await this.customersLink.click()
    await expect(this.page).toHaveURL(/\/customers/)
  }

  /**
   * Navigate to social publishing page
   */
  async navigateToSocial(): Promise<void> {
    await this.socialLink.click()
    await expect(this.page).toHaveURL(/\/social|\/publish/)
  }

  /**
   * Navigate to settings page
   */
  async navigateToSettings(): Promise<void> {
    await this.settingsLink.click()
    await expect(this.page).toHaveURL(/\/settings/)
  }

  /**
   * Logout via user menu
   */
  async logout(): Promise<void> {
    // Try direct logout button first
    if (await this.logoutButton.isVisible()) {
      await this.logoutButton.click()
    } else {
      // Open user menu then click logout
      await this.userMenu.click()
      await this.page.waitForTimeout(500)
      await this.page.getByText(/logout|sign out/i).click()
    }

    await expect(this.page).toHaveURL(/\/login/, { timeout: 10000 })
  }

  /**
   * Get count of visible stats cards
   */
  async getStatsCardCount(): Promise<number> {
    return this.statsCards.count()
  }

  /**
   * Check if dashboard has loaded with content
   */
  async hasContent(): Promise<boolean> {
    await this.page.waitForLoadState('domcontentloaded')
    const content = await this.page.locator('main').textContent()
    return (content?.length ?? 0) > 50
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/)
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      // Network idle timeout is ok, page might have ongoing polling
    })
  }
}
