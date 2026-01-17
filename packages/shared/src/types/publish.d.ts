/**
 * Publish - Social media publishing records
 */
import type { SocialPlatform } from './tenant'
export interface PublishRecord {
  id: string
  tenantId: string
  mediaIds: string[]
  pieceIds?: string[]
  caption: string
  hashtags: string[]
  platformCaptions?: Partial<Record<SocialPlatform, string>>
  platforms: SocialPlatform[]
  scheduledFor?: Date
  status: PublishStatus
  results: PlatformResult[]
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
  platforms: SocialPlatform[]
  scheduledFor?: Date
}
export interface UpdatePublishInput {
  caption?: string
  hashtags?: string[]
  platformCaptions?: Partial<Record<SocialPlatform, string>>
  platforms?: SocialPlatform[]
  scheduledFor?: Date
  status?: PublishStatus
}
export interface PublishFilters {
  status?: PublishStatus
  platform?: SocialPlatform
  search?: string
}
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
