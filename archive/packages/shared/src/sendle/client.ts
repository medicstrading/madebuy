/**
 * Sendle API Client
 *
 * Sendle API Base: https://api.sendle.com (production)
 * Sandbox: https://sandbox.sendle.com
 * Auth: Basic auth with Sendle ID + API Key
 *
 * @see https://api.sendle.com/api/documentation
 */

/* eslint-disable no-undef */

import Bottleneck from 'bottleneck'

// ============================================================================
// Configuration
// ============================================================================

export interface SendleConfig {
  sendleId: string
  apiKey: string
  sandbox?: boolean
}

const SENDLE_API_URL = 'https://api.sendle.com/api'
const SENDLE_SANDBOX_URL = 'https://sandbox.sendle.com/api'

// ============================================================================
// Error Types
// ============================================================================

export class SendleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SendleError'
  }
}

export class SendleValidationError extends SendleError {
  constructor(message: string, public readonly fieldErrors: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 422, { fieldErrors })
    this.name = 'SendleValidationError'
  }
}

export class SendleRateLimitError extends SendleError {
  constructor(public readonly retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds.`, 'RATE_LIMIT', 429)
    this.name = 'SendleRateLimitError'
  }
}

export class SendleAuthenticationError extends SendleError {
  constructor() {
    super('Invalid Sendle credentials', 'AUTHENTICATION_ERROR', 401)
    this.name = 'SendleAuthenticationError'
  }
}

export class SendleNotFoundError extends SendleError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404)
    this.name = 'SendleNotFoundError'
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

// Sendle API limits: 5 requests per second for most endpoints
const limiter = new Bottleneck({
  minTime: 200, // 200ms between requests = max 5/sec
  maxConcurrent: 3,
  reservoir: 50, // Allow burst of 50 requests
  reservoirRefreshAmount: 50,
  reservoirRefreshInterval: 10 * 1000, // Refill every 10 seconds
})

// ============================================================================
// Sendle Client
// ============================================================================

export interface SendleClient {
  request: <T>(endpoint: string, options?: RequestInit) => Promise<T>
  get: <T>(endpoint: string, params?: Record<string, string>) => Promise<T>
  post: <T>(endpoint: string, data?: unknown) => Promise<T>
  delete: <T>(endpoint: string) => Promise<T>
  getBaseUrl: () => string
  isSandbox: () => boolean
}

interface SendleErrorResponse {
  error?: string
  error_description?: string
  message?: string
  messages?: Record<string, string[]>
}

export function createSendleClient(config: SendleConfig): SendleClient {
  const baseUrl = config.sandbox ? SENDLE_SANDBOX_URL : SENDLE_API_URL
  const auth = Buffer.from(`${config.sendleId}:${config.apiKey}`).toString('base64')

  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return limiter.schedule(async () => {
      const url = `${baseUrl}${endpoint}`

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      })

      // Handle empty responses (e.g., DELETE)
      const text = await response.text()
      let data: T | SendleErrorResponse | undefined

      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          // Non-JSON response
        }
      }

      if (!response.ok) {
        const errorData = data as SendleErrorResponse | undefined

        switch (response.status) {
          case 401:
            throw new SendleAuthenticationError()

          case 404:
            throw new SendleNotFoundError('Resource', endpoint)

          case 422:
            throw new SendleValidationError(
              errorData?.error || errorData?.message || 'Validation error',
              errorData?.messages || {}
            )

          case 429: {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)
            throw new SendleRateLimitError(retryAfter)
          }

          default:
            throw new SendleError(
              errorData?.error || errorData?.message || `API error: ${response.status}`,
              'API_ERROR',
              response.status,
              errorData as Record<string, unknown>
            )
        }
      }

      return data as T
    })
  }

  return {
    request,

    async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
      let url = endpoint
      if (params && Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString()
        url = `${endpoint}?${queryString}`
      }
      return request<T>(url, { method: 'GET' })
    },

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
      return request<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      })
    },

    async delete<T>(endpoint: string): Promise<T> {
      return request<T>(endpoint, { method: 'DELETE' })
    },

    getBaseUrl(): string {
      return baseUrl
    },

    isSandbox(): boolean {
      return !!config.sandbox
    },
  }
}

// ============================================================================
// Credential Verification
// ============================================================================

export async function verifyCredentials(client: SendleClient): Promise<boolean> {
  try {
    // Ping endpoint returns account info if authenticated
    await client.get('/ping')
    return true
  } catch (error) {
    if (error instanceof SendleAuthenticationError) {
      return false
    }
    throw error
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get next business day in YYYY-MM-DD format (Australian timezone)
 */
export function getNextBusinessDay(): string {
  // Create date in Australian Eastern time
  const now = new Date()
  const aest = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }))

  // Add one day
  aest.setDate(aest.getDate() + 1)

  // Skip weekends
  const dayOfWeek = aest.getDay()
  if (dayOfWeek === 0) {
    // Sunday -> Monday
    aest.setDate(aest.getDate() + 1)
  } else if (dayOfWeek === 6) {
    // Saturday -> Monday
    aest.setDate(aest.getDate() + 2)
  }

  return aest.toISOString().split('T')[0]
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}
