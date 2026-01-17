/**
 * Publish - Social media publishing records
 */

import type { BlogPublishConfig } from './blog'
import type { SocialPlatform } from './tenant'

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

  // Recurring posts
  recurrence?: RecurrenceConfig

  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export type PublishStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'

// Recurring posts
export type RecurrenceIntervalUnit = 'hours' | 'days' | 'weeks'

export interface RecurrenceConfig {
  enabled: boolean
  intervalValue: number // 1-30
  intervalUnit: RecurrenceIntervalUnit
  totalOccurrences: number // 2-30
  completedOccurrences: number
  parentRecordId?: string // If this is a child record
  childRecordIds?: string[] // Track children from parent
}

export type RecurrenceInput = Omit<
  RecurrenceConfig,
  'completedOccurrences' | 'childRecordIds'
>

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
  recurrence?: RecurrenceInput
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
  recurrence?: Partial<RecurrenceConfig>
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
