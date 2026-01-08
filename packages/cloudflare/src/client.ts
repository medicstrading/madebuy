/**
 * Cloudflare API Client
 * Handles HTTP requests to Cloudflare API v4
 */

import type { CloudflareConfig, CloudflareResponse, CloudflareError } from './types'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    public errors: CloudflareError[],
    public status: number
  ) {
    super(message)
    this.name = 'CloudflareApiError'
  }
}

export class CloudflareClient {
  private apiToken: string
  private accountId?: string

  constructor(config: CloudflareConfig) {
    this.apiToken = config.apiToken
    this.accountId = config.accountId
  }

  /**
   * Get the account ID (required for some operations)
   */
  getAccountId(): string | undefined {
    return this.accountId
  }

  /**
   * Make a request to the Cloudflare API
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<CloudflareResponse<T>> {
    const url = `${CLOUDFLARE_API_BASE}${endpoint}`

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data = await response.json() as CloudflareResponse<T>

    if (!data.success) {
      const errorMessages = data.errors.map(e => e.message).join(', ')
      throw new CloudflareApiError(
        errorMessages || 'Cloudflare API request failed',
        data.errors,
        response.status
      )
    }

    return data
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<CloudflareResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams(params)
      url = `${endpoint}?${searchParams.toString()}`
    }
    return this.request<T>(url, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body: unknown): Promise<CloudflareResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body: unknown): Promise<CloudflareResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body: unknown): Promise<CloudflareResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<CloudflareResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * Verify the API token is valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      await this.get<{ id: string; status: string }>('/user/tokens/verify')
      return true
    } catch {
      return false
    }
  }

  /**
   * Get account details (and account ID if not provided)
   */
  async getAccounts(): Promise<{ id: string; name: string }[]> {
    const response = await this.get<{ id: string; name: string }[]>('/accounts')
    return response.result
  }
}

/**
 * Create a Cloudflare client from environment variables
 */
export function createCloudflareClient(): CloudflareClient | null {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID

  if (!apiToken) {
    return null
  }

  return new CloudflareClient({ apiToken, accountId })
}

/**
 * Create a Cloudflare client for a specific tenant's API token
 */
export function createTenantCloudflareClient(apiToken: string, accountId?: string): CloudflareClient {
  return new CloudflareClient({ apiToken, accountId })
}
