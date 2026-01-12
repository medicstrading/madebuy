import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object for Authentication pages (Login, Register, Forgot Password)
 */
export class AuthPage {
  readonly page: Page

  // Login page locators
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator
  readonly forgotPasswordLink: Locator
  readonly registerLink: Locator

  // Register page locators
  readonly nameInput: Locator
  readonly confirmPasswordInput: Locator
  readonly registerButton: Locator

  constructor(page: Page) {
    this.page = page

    // Login form
    this.emailInput = page.getByLabel(/email/i)
    this.passwordInput = page.getByLabel(/^password$/i)
    this.loginButton = page.getByRole('button', { name: /sign in|log in/i })
    this.errorMessage = page.locator('[role="alert"]').or(page.getByText(/invalid|incorrect|error/i))
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot|reset/i })
    this.registerLink = page.getByRole('link', { name: /register|sign up|create/i })

    // Register form
    this.nameInput = page.getByLabel(/name/i)
    this.confirmPasswordInput = page.getByLabel(/confirm password/i)
    this.registerButton = page.getByRole('button', { name: /register|sign up|create/i })
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to register page
   */
  async gotoRegister(): Promise<void> {
    await this.page.goto('/register')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to forgot password page
   */
  async gotoForgotPassword(): Promise<void> {
    await this.page.goto('/forgot-password')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Fill and submit login form
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  /**
   * Login and wait for dashboard redirect
   */
  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password)
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  }

  /**
   * Fill and submit registration form
   */
  async register(name: string, email: string, password: string): Promise<void> {
    if (await this.nameInput.isVisible()) {
      await this.nameInput.fill(name)
    }
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(password)
    }
    await this.registerButton.click()
  }

  /**
   * Check if login error is displayed
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible({ timeout: 5000 }).catch(() => false)
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return this.errorMessage.textContent()
    }
    return null
  }

  /**
   * Check if user is on login page
   */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login')
  }

  /**
   * Check if user is authenticated (not on auth pages)
   */
  async isAuthenticated(): Promise<boolean> {
    const url = this.page.url()
    return !url.includes('/login') && !url.includes('/register')
  }

  /**
   * Submit forgot password request
   */
  async submitForgotPassword(email: string): Promise<void> {
    await this.emailInput.fill(email)
    const submitButton = this.page.getByRole('button', { name: /send|reset|submit/i })
    await submitButton.click()
  }

  /**
   * Wait for success message after password reset request
   */
  async waitForResetSuccess(): Promise<void> {
    await expect(
      this.page.getByText(/email sent|check your email|password reset/i)
    ).toBeVisible({ timeout: 10000 })
  }
}
