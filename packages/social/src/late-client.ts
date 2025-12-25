import type { SocialPlatform, PlatformResult } from '@madebuy/shared'

const LATE_API_BASE = 'https://api.late.ai/v1' // Placeholder - replace with actual Late API endpoint
const LATE_API_KEY = process.env.LATE_API_KEY

if (!LATE_API_KEY) {
  console.warn('⚠️  LATE_API_KEY not configured. Social publishing will fail.')
}

export interface LatePublishRequest {
  platforms: SocialPlatform[]
  caption: string
  mediaUrls: string[]
  scheduledFor?: Date
  tenantAccessTokens?: Record<SocialPlatform, string>
}

export interface LatePublishResponse {
  id: string
  status: 'scheduled' | 'published' | 'failed'
  results: PlatformResult[]
}

export interface LateOAuthUrlRequest {
  platform: SocialPlatform
  redirectUri: string
  state: string
}

export interface LateOAuthUrlResponse {
  authUrl: string
}

export interface LateOAuthTokenRequest {
  platform: SocialPlatform
  code: string
  redirectUri: string
}

export interface LateOAuthTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scope?: string
}

/**
 * Late API Client for multi-platform social media publishing
 *
 * NOTE: This is a placeholder implementation. The actual Late API
 * may have different endpoints and request/response formats.
 * Update this file based on Late API documentation.
 */
export class LateClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || LATE_API_KEY || ''
    this.baseUrl = LATE_API_BASE
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Late API error: ${response.status} ${error}`)
    }

    return await response.json()
  }

  /**
   * Publish content to multiple social platforms
   */
  async publish(request: LatePublishRequest): Promise<LatePublishResponse> {
    return await this.request<LatePublishResponse>('/publish', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get OAuth authorization URL for a platform
   */
  async getOAuthUrl(request: LateOAuthUrlRequest): Promise<LateOAuthUrlResponse> {
    return await this.request<LateOAuthUrlResponse>('/oauth/authorize', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Exchange OAuth code for access token
   */
  async getOAuthToken(request: LateOAuthTokenRequest): Promise<LateOAuthTokenResponse> {
    return await this.request<LateOAuthTokenResponse>('/oauth/token', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  /**
   * Get publishing status
   */
  async getPublishStatus(publishId: string): Promise<LatePublishResponse> {
    return await this.request<LatePublishResponse>(`/publish/${publishId}`)
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(publishId: string): Promise<void> {
    await this.request(`/publish/${publishId}`, {
      method: 'DELETE',
    })
  }
}

// Singleton instance
export const lateClient = new LateClient()
