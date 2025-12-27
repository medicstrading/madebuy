/**
 * Publish - Social media publishing records
 */

import type { SocialPlatform } from './tenant'
import type { BlogPublishConfig } from './blog'

export interface PublishRecord {
  id: string
  tenantId: string

  mediaIds: string[]
  pieceIds?: string[]

  // Content
  caption: string
  hashtags: string[]
  platformCaptions?: Partial<Record<SocialPlatform, string>>

  // Blog-specific content (only present if 'website-blog' in platforms)
  blogConfig?: BlogPublishConfig

  // Publishing
  platforms: SocialPlatform[]
  scheduledFor?: Date

  // Status
  status: PublishStatus

  // Results
  results: PlatformResult[]

  // Blog post reference (if published to blog)
  blogPostId?: string

  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export type PublishStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'

export interface PlatformResult {
  platform: SocialPlatform
  status: 'pending' | 'success' | 'failed'
  postId?: string
  postUrl?: string
  error?: string
  publishedAt?: Date
}

export interface CreatePublishInput {
  mediaIds: string[]
  pieceIds?: string[]
  caption: string
  hashtags?: string[]
  platformCaptions?: Partial<Record<SocialPlatform, string>>
  blogConfig?: BlogPublishConfig
  platforms: SocialPlatform[]
  scheduledFor?: Date
}

export interface UpdatePublishInput {
  caption?: string
  hashtags?: string[]
  platformCaptions?: Partial<Record<SocialPlatform, string>>
  blogConfig?: BlogPublishConfig
  platforms?: SocialPlatform[]
  scheduledFor?: Date
  status?: PublishStatus
  blogPostId?: string
}

export interface PublishFilters {
  status?: PublishStatus
  platform?: SocialPlatform
  search?: string
}

// AI Caption Generation
export interface AICaptionRequest {
  mediaIds: string[]
  pieceId?: string
  style?: 'casual' | 'professional' | 'playful'
  includeHashtags?: boolean
  maxLength?: number
}

export interface AICaptionResponse {
  caption: string
  hashtags: string[]
  confidence: number
}
