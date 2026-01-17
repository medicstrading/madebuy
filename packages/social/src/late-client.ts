/**
 * Late.dev API Client
 * https://getlate.dev/docs
 *
 * Late is a unified social media scheduling platform supporting:
 * - Instagram (feed, reels, stories)
 * - Facebook (pages, groups)
 * - TikTok, LinkedIn, YouTube, Twitter, Threads, Pinterest, Reddit, Mastodon
 */

import type { PlatformResult, SocialPlatform } from '@madebuy/shared'

// =============================================================================
// Types
// =============================================================================

export type LatePlatformType =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'twitter'
  | 'threads'
  | 'pinterest'
  | 'reddit'
  | 'mastodon'

export interface LatePost {
  content: string
  scheduledFor?: string // ISO 8601 timestamp, omit for immediate publish
  platforms: LatePlatform[]
  mediaItems?: LateMedia[] // Late.dev uses 'mediaItems' not 'media'
}

export interface LatePlatform {
  platform: LatePlatformType
  accountId: string // Late account ID for the platform
  settings?: {
    // Instagram-specific
    firstComment?: string
    collaborators?: string[]
    location?: {
      name: string
      latitude?: number
      longitude?: number
    }

    // Facebook-specific
    targeting?: {
      geoLocations?: string[]
      locales?: string[]
      ageMin?: number
      ageMax?: number
    }
  }
}

export interface LateMedia {
  url: string
  type: 'image' | 'video' | 'gif'
  altText?: string
  thumbnail?: string // For videos
}

export interface LatePostResponse {
  success: boolean
  postId?: string
  scheduledId?: string
  platformPosts?: Array<{
    platform: string
    accountId: string
    platformPostId?: string
    platformPostUrl?: string // Late.dev returns this for Pinterest
    permalink?: string
    error?: string
  }>
  error?: string
}

export interface LateAccount {
  id: string
  platform: string
  username: string
  displayName: string
  profileImage?: string
  isActive: boolean
  permissions: string[]
  createdAt: string
}

export interface LateAccountsResponse {
  accounts: LateAccount[]
}

export interface LateProfile {
  _id: string
  userId: string
  name: string
  description?: string
  isDefault: boolean
  color?: string
  createdAt: string
  updatedAt: string
}

export interface LateProfilesResponse {
  profiles: LateProfile[]
}

// Legacy types for backwards compatibility
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

// =============================================================================
// Internal API Request/Response Types
// =============================================================================

/**
 * Generic API error response from Late.dev
 */
export interface LateAPIError {
  message?: string
  error?: string
  details?: string
  error_description?: string
  raw?: string
}

/**
 * GET /profiles response
 */
export interface LateProfilesAPIResponse {
  profiles: LateProfile[]
}

/**
 * GET /accounts response
 */
export interface LateAccountsAPIResponse {
  accounts: LateAccount[]
}

/**
 * GET /connect/{platform} response
 */
export interface LateConnectAPIResponse {
  authUrl: string
}

/**
 * POST /posts request
 */
export interface LateCreatePostAPIRequest {
  content: string
  scheduledFor?: string
  platforms: LatePlatform[]
  mediaItems?: LateMedia[]
}

/**
 * POST /posts response
 */
export interface LateCreatePostAPIResponse {
  id: string
  scheduledId?: string
  platformPosts?: Array<{
    platform: string
    accountId: string
    platformPostId?: string
    platformPostUrl?: string
    permalink?: string
    error?: string
  }>
}

/**
 * GET /posts/{id} response
 */
export interface LateGetPostAPIResponse {
  id: string
  status?: 'scheduled' | 'published' | 'failed'
  content: string
  scheduledFor?: string
  createdAt: string
  updatedAt: string
  platformPosts?: Array<{
    platform: string
    accountId: string
    platformPostId?: string
    platformPostUrl?: string
    permalink?: string
    error?: string
  }>
}

/**
 * POST /media response
 */
export interface LateUploadMediaAPIResponse {
  url: string
  mediaId?: string
  type: 'image' | 'video'
}

/**
 * POST /oauth/token response (legacy)
 */
export interface LateOAuthTokenAPIResponse {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scope?: string
}

// =============================================================================
// Late.dev API Client
// =============================================================================

export class LateClient {
  private baseUrl = 'https://getlate.dev/api/v1'
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LATE_API_KEY || ''

    if (!this.apiKey) {
      throw new Error(
        'Late API key is required. Set LATE_API_KEY environment variable.',
      )
    }
  }

  // ===========================================================================
  // Profile Methods
  // ===========================================================================

  /**
   * Get all profiles
   */
  async getProfiles(): Promise<LateProfilesResponse> {
    const response = await this.request<void, LateProfilesAPIResponse>(
      'GET',
      '/profiles',
    )
    return response
  }

  /**
   * Get default profile ID
   */
  async getDefaultProfileId(): Promise<string> {
    const data = await this.getProfiles()
    const defaultProfile =
      data.profiles.find((p) => p.isDefault) || data.profiles[0]

    if (!defaultProfile) {
      throw new Error('No profiles found in Late.dev account')
    }

    return defaultProfile._id
  }

  // ===========================================================================
  // Account Methods
  // ===========================================================================

  /**
   * Get all connected accounts
   */
  async getAccounts(): Promise<LateAccountsResponse> {
    const response = await this.request<void, LateAccountsAPIResponse>(
      'GET',
      '/accounts',
    )
    return response
  }

  /**
   * Get accounts for a specific platform
   */
  async getAccountsByPlatform(platform: string): Promise<LateAccount[]> {
    const data = await this.getAccounts()
    return data.accounts.filter((acc) => acc.platform === platform)
  }

  /**
   * Connect a new account (returns OAuth URL)
   * Uses Late.dev's documented OAuth flow: GET /v1/connect/{platform}
   */
  async getConnectUrl(platform: string, redirectUri?: string): Promise<string> {
    // Get the actual profileId from Late.dev API
    const profileId = await this.getDefaultProfileId()

    const redirect_url = redirectUri || process.env.NEXT_PUBLIC_SITE_URL

    // Build query parameters - conditionally include redirect_url if defined
    const params = new URLSearchParams({
      profileId,
      ...(redirect_url && { redirect_url }),
    })

    // Use GET request with query params, not POST with body
    const url = `${this.baseUrl}/connect/${platform}?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData.message || errorData.error || `HTTP ${response.status}`
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data.authUrl
  }

  /**
   * Disconnect an account
   */
  async disconnectAccount(accountId: string): Promise<void> {
    await this.request<void, void>('DELETE', `/accounts/${accountId}`)
  }

  // ===========================================================================
  // Post Methods
  // ===========================================================================

  /**
   * Create and publish/schedule a post
   */
  async createPost(post: LatePost): Promise<LatePostResponse> {
    try {
      const response = await this.request<
        LateCreatePostAPIRequest,
        LateCreatePostAPIResponse
      >('POST', '/posts', post)

      return {
        success: true,
        postId: response.id,
        scheduledId: response.scheduledId,
        platformPosts: response.platformPosts,
      }
    } catch (error) {
      // Extract the most detailed error message available (sanitized for client)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Failed to publish via Late.dev'

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Legacy publish method for backwards compatibility
   * Converts LatePublishRequest to LatePost format
   */
  async publish(request: LatePublishRequest): Promise<LatePublishResponse> {
    const post: LatePost = {
      content: request.caption,
      scheduledFor: request.scheduledFor?.toISOString(),
      platforms: request.platforms.map((platform) => ({
        platform: platform as LatePlatformType,
        accountId: '', // Caller needs to provide account IDs via createPost instead
      })),
      mediaItems: request.mediaUrls?.map((url) => ({
        url,
        type: (url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'image') as
          | 'image'
          | 'video',
      })),
    }

    const result = await this.createPost(post)

    return {
      id: result.postId || '',
      status: result.success
        ? request.scheduledFor
          ? 'scheduled'
          : 'published'
        : 'failed',
      results:
        result.platformPosts?.map((pp) => ({
          platform: pp.platform as SocialPlatform,
          status: pp.error ? ('failed' as const) : ('success' as const),
          postId: pp.platformPostId,
          postUrl: pp.platformPostUrl || pp.permalink,
          error: pp.error,
        })) || [],
    }
  }

  /**
   * Upload media to Late.dev
   * Returns URL that can be used in post.mediaItems
   */
  async uploadMedia(
    file: File | Blob,
    type: 'image' | 'video',
  ): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await fetch(`${this.baseUrl}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = (await response.json()) as LateAPIError
      throw new Error(error.message || 'Failed to upload media')
    }

    const data = (await response.json()) as LateUploadMediaAPIResponse
    return data.url
  }

  /**
   * Get post status
   */
  async getPost(postId: string): Promise<LateGetPostAPIResponse> {
    return await this.request<void, LateGetPostAPIResponse>(
      'GET',
      `/posts/${postId}`,
    )
  }

  /**
   * Delete a scheduled post
   */
  async deletePost(postId: string): Promise<void> {
    await this.request<void, void>('DELETE', `/posts/${postId}`)
  }

  /**
   * Get publishing status (legacy alias)
   */
  async getPublishStatus(publishId: string): Promise<LatePublishResponse> {
    const post = await this.getPost(publishId)
    return {
      id: post.id,
      status: post.status || 'published',
      results:
        post.platformPosts?.map((pp) => ({
          platform: pp.platform as SocialPlatform,
          status: pp.error ? ('failed' as const) : ('success' as const),
          postId: pp.platformPostId,
          postUrl: pp.platformPostUrl || pp.permalink,
          error: pp.error,
        })) || [],
    }
  }

  /**
   * Cancel a scheduled post (legacy alias)
   */
  async cancelScheduledPost(publishId: string): Promise<void> {
    await this.deletePost(publishId)
  }

  // ===========================================================================
  // Legacy OAuth Methods (kept for backwards compatibility)
  // ===========================================================================

  /**
   * Get OAuth authorization URL for a platform
   * @deprecated Use getConnectUrl instead
   */
  async getOAuthUrl(
    request: LateOAuthUrlRequest,
  ): Promise<LateOAuthUrlResponse> {
    const authUrl = await this.getConnectUrl(
      request.platform,
      request.redirectUri,
    )
    return { authUrl }
  }

  /**
   * Exchange OAuth code for access token
   * Note: Late.dev handles this internally, tokens are stored in your Late.dev account
   */
  async getOAuthToken(
    request: LateOAuthTokenRequest,
  ): Promise<LateOAuthTokenResponse> {
    return await this.request<LateOAuthTokenRequest, LateOAuthTokenAPIResponse>(
      'POST',
      '/oauth/token',
      request,
    )
  }

  // ===========================================================================
  // Internal Request Handler
  // ===========================================================================

  private async request<TRequest = void, TResponse = unknown>(
    method: string,
    endpoint: string,
    data?: TRequest,
  ): Promise<TResponse> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }

    const options: RequestInit = {
      method,
      headers,
      cache: 'no-store', // Disable Next.js fetch caching for real-time data
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      // Try to parse as JSON, but also capture raw text in case it's not JSON
      let errorData: LateAPIError = {}
      let rawBody = ''

      try {
        const text = await response.text()
        rawBody = text
        errorData = JSON.parse(text) as LateAPIError
      } catch {
        // Response is not JSON, use raw text
        errorData = { raw: rawBody }
      }

      // Extract error message from various possible fields (sanitized - no sensitive data)
      const errorMessage =
        errorData.message ||
        errorData.error ||
        errorData.details ||
        errorData.error_description ||
        (typeof errorData === 'string' ? errorData : null) ||
        `Late.dev API error: HTTP ${response.status}`

      throw new Error(errorMessage)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as TResponse
    }

    return (await response.json()) as TResponse
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let lateClientInstance: LateClient | null = null

export function getLateClient(): LateClient {
  if (!lateClientInstance) {
    lateClientInstance = new LateClient()
  }
  return lateClientInstance
}

// Legacy singleton export for backwards compatibility
export const lateClient = new Proxy({} as LateClient, {
  get(_, prop) {
    const client = getLateClient()
    return client[prop as keyof LateClient]
  },
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper: Publish immediately to multiple platforms
 */
export async function publishToLate(
  content: string,
  platforms: Array<{ platform: string; accountId: string }>,
  mediaUrls?: string[],
): Promise<LatePostResponse> {
  const client = getLateClient()

  const post: LatePost = {
    content,
    platforms: platforms.map((p) => ({
      platform: p.platform as LatePlatformType,
      accountId: p.accountId,
    })),
    mediaItems: mediaUrls?.map((url) => ({
      url,
      type: (url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'image') as
        | 'image'
        | 'video',
    })),
  }

  return await client.createPost(post)
}

/**
 * Helper: Schedule a post for later
 */
export async function scheduleToLate(
  content: string,
  scheduledFor: Date,
  platforms: Array<{ platform: string; accountId: string }>,
  mediaUrls?: string[],
): Promise<LatePostResponse> {
  const client = getLateClient()

  const post: LatePost = {
    content,
    scheduledFor: scheduledFor.toISOString(),
    platforms: platforms.map((p) => ({
      platform: p.platform as LatePlatformType,
      accountId: p.accountId,
    })),
    mediaItems: mediaUrls?.map((url) => ({
      url,
      type: (url.match(/\.(mp4|mov|avi)$/i) ? 'video' : 'image') as
        | 'image'
        | 'video',
    })),
  }

  return await client.createPost(post)
}
