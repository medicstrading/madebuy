import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object for the Settings pages
 */
export class SettingsPage {
  readonly page: Page

  // Navigation tabs/links
  readonly profileTab: Locator
  readonly storeTab: Locator
  readonly shippingTab: Locator
  readonly paymentsTab: Locator
  readonly integrationsTab: Locator
  readonly billingTab: Locator

  // Profile settings
  readonly businessNameInput: Locator
  readonly emailInput: Locator
  readonly phoneInput: Locator
  readonly profileSaveButton: Locator

  // Store settings
  readonly storeNameInput: Locator
  readonly storeDescriptionInput: Locator
  readonly logoUpload: Locator
  readonly bannerUpload: Locator
  readonly primaryColorPicker: Locator
  readonly storeSaveButton: Locator

  // Shipping settings
  readonly addShippingRateButton: Locator
  readonly shippingRates: Locator
  readonly domesticShippingToggle: Locator
  readonly internationalShippingToggle: Locator

  // Payment settings
  readonly stripeConnectButton: Locator
  readonly stripeStatus: Locator
  readonly paypalConnectButton: Locator
  readonly paypalStatus: Locator

  // General
  readonly saveButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page

    // Navigation
    this.profileTab = page.getByRole('tab', { name: /profile|account/i })
      .or(page.getByRole('link', { name: /profile|account/i }))
    this.storeTab = page.getByRole('tab', { name: /store|shop/i })
      .or(page.getByRole('link', { name: /store|shop/i }))
    this.shippingTab = page.getByRole('tab', { name: /shipping/i })
      .or(page.getByRole('link', { name: /shipping/i }))
    this.paymentsTab = page.getByRole('tab', { name: /payment/i })
      .or(page.getByRole('link', { name: /payment/i }))
    this.integrationsTab = page.getByRole('tab', { name: /integration/i })
      .or(page.getByRole('link', { name: /integration/i }))
    this.billingTab = page.getByRole('tab', { name: /billing|subscription/i })
      .or(page.getByRole('link', { name: /billing|subscription/i }))

    // Profile
    this.businessNameInput = page.getByLabel(/business name|company/i)
    this.emailInput = page.getByLabel(/email/i)
    this.phoneInput = page.getByLabel(/phone/i)
    this.profileSaveButton = page.getByRole('button', { name: /save profile|update profile/i })

    // Store
    this.storeNameInput = page.getByLabel(/store name|shop name/i)
    this.storeDescriptionInput = page.getByLabel(/store description|about/i)
    this.logoUpload = page.locator('[data-testid="logo-upload"]')
      .or(page.getByText(/logo/i).locator('..').getByRole('button'))
    this.bannerUpload = page.locator('[data-testid="banner-upload"]')
      .or(page.getByText(/banner/i).locator('..').getByRole('button'))
    this.primaryColorPicker = page.locator('[data-testid="color-picker"]')
      .or(page.getByLabel(/primary color/i))
    this.storeSaveButton = page.getByRole('button', { name: /save store|update store/i })

    // Shipping
    this.addShippingRateButton = page.getByRole('button', { name: /add.*rate|new.*rate/i })
    this.shippingRates = page.locator('[data-testid="shipping-rate"]')
      .or(page.locator('.shipping-rate'))
    this.domesticShippingToggle = page.getByLabel(/domestic/i)
      .or(page.getByText(/domestic/i).locator('..').getByRole('switch'))
    this.internationalShippingToggle = page.getByLabel(/international/i)
      .or(page.getByText(/international/i).locator('..').getByRole('switch'))

    // Payments
    this.stripeConnectButton = page.getByRole('button', { name: /connect.*stripe|stripe.*connect/i })
      .or(page.getByRole('link', { name: /connect.*stripe/i }))
    this.stripeStatus = page.locator('[data-testid="stripe-status"]')
      .or(page.getByText(/stripe/i).locator('..').getByText(/connected|not connected/i))
    this.paypalConnectButton = page.getByRole('button', { name: /connect.*paypal/i })
    this.paypalStatus = page.locator('[data-testid="paypal-status"]')

    // General
    this.saveButton = page.getByRole('button', { name: /save/i })
    this.successMessage = page.getByText(/saved|updated|success/i)
      .or(page.locator('[role="status"]'))
    this.errorMessage = page.getByText(/error|failed/i)
      .or(page.locator('[role="alert"]'))
  }

  /**
   * Navigate to settings page
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard/settings')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to profile settings
   */
  async gotoProfile(): Promise<void> {
    await this.page.goto('/dashboard/settings/profile')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to store settings
   */
  async gotoStore(): Promise<void> {
    await this.page.goto('/dashboard/settings/store')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to shipping settings
   */
  async gotoShipping(): Promise<void> {
    await this.page.goto('/dashboard/settings/shipping')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to payment settings
   */
  async gotoPayments(): Promise<void> {
    await this.page.goto('/dashboard/settings/payments')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to billing/subscription settings
   */
  async gotoBilling(): Promise<void> {
    await this.page.goto('/dashboard/settings/billing')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Update profile information
   */
  async updateProfile(data: { businessName?: string; email?: string; phone?: string }): Promise<void> {
    if (data.businessName && await this.businessNameInput.isVisible()) {
      await this.businessNameInput.fill(data.businessName)
    }
    if (data.email && await this.emailInput.isVisible()) {
      await this.emailInput.fill(data.email)
    }
    if (data.phone && await this.phoneInput.isVisible()) {
      await this.phoneInput.fill(data.phone)
    }

    const saveBtn = this.profileSaveButton.or(this.saveButton)
    await saveBtn.click()
  }

  /**
   * Update store settings
   */
  async updateStore(data: { name?: string; description?: string }): Promise<void> {
    if (data.name && await this.storeNameInput.isVisible()) {
      await this.storeNameInput.fill(data.name)
    }
    if (data.description && await this.storeDescriptionInput.isVisible()) {
      await this.storeDescriptionInput.fill(data.description)
    }

    const saveBtn = this.storeSaveButton.or(this.saveButton)
    await saveBtn.click()
  }

  /**
   * Check if Stripe is connected
   */
  async isStripeConnected(): Promise<boolean> {
    const status = await this.stripeStatus.textContent().catch(() => '')
    return status?.toLowerCase().includes('connected') ?? false
  }

  /**
   * Wait for save success
   */
  async waitForSaveSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 })
  }

  /**
   * Check if save had error
   */
  async hasSaveError(): Promise<boolean> {
    return this.errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Get number of shipping rates
   */
  async getShippingRateCount(): Promise<number> {
    return this.shippingRates.count()
  }
}
