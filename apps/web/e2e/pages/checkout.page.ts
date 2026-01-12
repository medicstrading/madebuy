import { Page, Locator, expect } from '@playwright/test'
import { TestCustomer } from '../fixtures'

/**
 * Page Object for the Checkout page
 */
export class CheckoutPage {
  readonly page: Page
  readonly tenantSlug: string

  // Customer information
  readonly emailInput: Locator
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly phoneInput: Locator

  // Shipping address
  readonly addressLine1Input: Locator
  readonly addressLine2Input: Locator
  readonly cityInput: Locator
  readonly stateInput: Locator
  readonly postalCodeInput: Locator
  readonly countrySelect: Locator

  // Shipping options
  readonly shippingOptions: Locator
  readonly standardShipping: Locator
  readonly expressShipping: Locator

  // Payment (when not using Stripe redirect)
  readonly cardNumberInput: Locator
  readonly cardExpiryInput: Locator
  readonly cardCvcInput: Locator

  // Order summary
  readonly orderItems: Locator
  readonly subtotal: Locator
  readonly shippingCost: Locator
  readonly discount: Locator
  readonly total: Locator

  // Order notes
  readonly orderNotesInput: Locator
  readonly giftMessageCheckbox: Locator
  readonly giftMessageInput: Locator

  // Actions
  readonly placeOrderButton: Locator
  readonly backToCartLink: Locator

  // Messages
  readonly validationErrors: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  // Stripe redirect indicator
  readonly stripeRedirect: Locator

  constructor(page: Page, tenantSlug: string) {
    this.page = page
    this.tenantSlug = tenantSlug

    // Customer info
    this.emailInput = page.getByLabel(/email/i)
    this.firstNameInput = page.getByLabel(/first name/i)
    this.lastNameInput = page.getByLabel(/last name/i)
    this.phoneInput = page.getByLabel(/phone/i)

    // Shipping address
    this.addressLine1Input = page.getByLabel(/address|street|line 1/i)
    this.addressLine2Input = page.getByLabel(/apartment|suite|line 2/i)
    this.cityInput = page.getByLabel(/city|suburb/i)
    this.stateInput = page.getByLabel(/state|province/i)
    this.postalCodeInput = page.getByLabel(/postal|zip|post code/i)
    this.countrySelect = page.getByLabel(/country/i)

    // Shipping options
    this.shippingOptions = page.locator('[data-testid="shipping-option"]')
      .or(page.locator('[name="shipping"]'))
    this.standardShipping = page.getByLabel(/standard/i)
      .or(page.locator('[value="standard"]'))
    this.expressShipping = page.getByLabel(/express/i)
      .or(page.locator('[value="express"]'))

    // Payment
    this.cardNumberInput = page.getByLabel(/card number/i)
      .or(page.locator('[name="cardNumber"]'))
    this.cardExpiryInput = page.getByLabel(/expir/i)
      .or(page.locator('[name="cardExpiry"]'))
    this.cardCvcInput = page.getByLabel(/cvc|cvv|security/i)
      .or(page.locator('[name="cardCvc"]'))

    // Order summary
    this.orderItems = page.locator('[data-testid="order-item"]')
      .or(page.locator('.order-item'))
    this.subtotal = page.getByText(/subtotal/i).locator('..')
    this.shippingCost = page.getByText(/shipping/i).locator('..')
    this.discount = page.getByText(/discount/i).locator('..')
    this.total = page.locator('[data-testid="order-total"]')
      .or(page.getByText(/^total$/i).locator('..'))

    // Order notes
    this.orderNotesInput = page.getByLabel(/note|message|instruction/i)
    this.giftMessageCheckbox = page.getByLabel(/gift/i)
    this.giftMessageInput = page.getByLabel(/gift message/i)

    // Actions
    this.placeOrderButton = page.getByRole('button', { name: /place order|pay|submit|complete/i })
    this.backToCartLink = page.getByRole('link', { name: /back|cart/i })

    // Messages
    this.validationErrors = page.locator('.error, [class*="error"], [role="alert"]')
    this.successMessage = page.getByText(/order placed|thank you|success/i)
    this.errorMessage = page.getByText(/error|failed|unable/i)
      .or(page.locator('[role="alert"]'))

    // Stripe
    this.stripeRedirect = page.locator('[data-testid="stripe-redirect"]')
  }

  /**
   * Navigate to checkout page
   */
  async goto(): Promise<void> {
    await this.page.goto(`/${this.tenantSlug}/checkout`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Check if redirected to cart (empty cart)
   */
  async wasRedirectedToCart(): Promise<boolean> {
    return this.page.url().includes('/cart')
  }

  /**
   * Check if redirected to Stripe
   */
  async isOnStripe(): Promise<boolean> {
    return this.page.url().includes('stripe.com')
  }

  /**
   * Fill customer information
   */
  async fillCustomerInfo(customer: Partial<TestCustomer>): Promise<void> {
    if (customer.email && await this.emailInput.isVisible()) {
      await this.emailInput.fill(customer.email)
    }
    if (customer.firstName && await this.firstNameInput.isVisible()) {
      await this.firstNameInput.fill(customer.firstName)
    }
    if (customer.lastName && await this.lastNameInput.isVisible()) {
      await this.lastNameInput.fill(customer.lastName)
    }
    if (customer.phone && await this.phoneInput.isVisible()) {
      await this.phoneInput.fill(customer.phone)
    }
  }

  /**
   * Fill shipping address
   */
  async fillShippingAddress(address: TestCustomer['address']): Promise<void> {
    if (address.line1 && await this.addressLine1Input.isVisible()) {
      await this.addressLine1Input.fill(address.line1)
    }
    if (address.line2 && await this.addressLine2Input.isVisible()) {
      await this.addressLine2Input.fill(address.line2)
    }
    if (address.city && await this.cityInput.isVisible()) {
      await this.cityInput.fill(address.city)
    }
    if (address.state && await this.stateInput.isVisible()) {
      try {
        await this.stateInput.selectOption(address.state)
      } catch {
        await this.stateInput.fill(address.state)
      }
    }
    if (address.postalCode && await this.postalCodeInput.isVisible()) {
      await this.postalCodeInput.fill(address.postalCode)
    }
    if (address.country && await this.countrySelect.isVisible()) {
      await this.countrySelect.selectOption(address.country)
    }
  }

  /**
   * Fill all checkout fields with customer data
   */
  async fillCheckoutForm(customer: TestCustomer): Promise<void> {
    await this.fillCustomerInfo(customer)
    if (customer.address) {
      await this.fillShippingAddress(customer.address)
    }
  }

  /**
   * Select shipping option
   */
  async selectShipping(option: 'standard' | 'express'): Promise<void> {
    if (option === 'standard' && await this.standardShipping.isVisible()) {
      await this.standardShipping.check()
    } else if (option === 'express' && await this.expressShipping.isVisible()) {
      await this.expressShipping.check()
    }
  }

  /**
   * Add order note
   */
  async addOrderNote(note: string): Promise<void> {
    if (await this.orderNotesInput.isVisible()) {
      await this.orderNotesInput.fill(note)
    }
  }

  /**
   * Click place order button
   */
  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click()
  }

  /**
   * Place order and wait for result
   */
  async placeOrderAndWait(): Promise<void> {
    await this.placeOrder()
    await this.page.waitForTimeout(3000)
  }

  /**
   * Check if place order is enabled
   */
  async isPlaceOrderEnabled(): Promise<boolean> {
    return !await this.placeOrderButton.isDisabled()
  }

  /**
   * Check if there are validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    return this.validationErrors.first().isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Get validation error messages
   */
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = []
    const count = await this.validationErrors.count()
    for (let i = 0; i < count; i++) {
      const text = await this.validationErrors.nth(i).textContent()
      if (text) errors.push(text.trim())
    }
    return errors
  }

  /**
   * Check if order was successful
   */
  async wasOrderSuccessful(): Promise<boolean> {
    return this.successMessage.isVisible({ timeout: 10000 }).catch(() => false)
      || this.page.url().includes('/success')
      || this.page.url().includes('/confirmation')
      || this.page.url().includes('/thank-you')
  }

  /**
   * Check if there was an error
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
  }

  /**
   * Get order total
   */
  async getTotal(): Promise<number | null> {
    const text = await this.total.textContent()
    if (!text) return null
    const match = text.match(/[\d,.]+/)
    return match ? parseFloat(match[0].replace(',', '')) : null
  }

  /**
   * Get order item count
   */
  async getItemCount(): Promise<number> {
    return this.orderItems.count()
  }

  /**
   * Wait for page to be ready
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(1000)
  }
}
