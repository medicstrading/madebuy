/**
 * Media - Photos and videos with platform-optimized variants
 */

import type { SocialPlatform } from './tenant'

export interface MediaItem {
  id: string
  tenantId: string

  // File info
  type: MediaType
  mimeType: string
  originalFilename: string

  // IP Protection - Perceptual hash for theft detection
  hash?: string // pHash for image similarity detection & ownership proof

  // Storage - platform-optimized variants
  variants: MediaVariants

  // Platform optimization tracking
  platformOptimized: SocialPlatform[]

  // Content (for publishing)
  caption?: string
  hashtags?: string[]
  altText?: string

  // Optional link to inventory
  pieceId?: string

  // Organization
  tags: string[]
  isFavorite: boolean

  // Publishing history
  publishedTo: PublishDestination[]

  // Timestamps
  createdAt: Date
  updatedAt: Date

  // Source tracking
  source: MediaSource
  importedFrom?: string // URL if imported
}

export type MediaType = 'image' | 'video'
export type MediaSource = 'upload' | 'import'

export interface MediaVariants {
  original: MediaVariant // Full resolution, no watermark (buyers & admin only)
  watermarked?: MediaVariant // Public display with MadeBuy watermark (1600px max)
  large?: MediaVariant // 1200px max
  thumb?: MediaVariant // 400px max (no watermark for admin)

  // Platform-optimized image variants (auto-generated on upload)
  instagramFeed?: MediaVariant // 1080×1350 (4:5 portrait)
  facebookFeed?: MediaVariant // 1200×1200 (1:1 square)
  pinterest?: MediaVariant // 1000×1500 (2:3 pin)

  // Platform-optimized video variants (generated on-demand before publish)
  instagramReel?: MediaVariant // 1080×1920 (9:16 vertical)
  tiktok?: MediaVariant // 1080×1920 (9:16 vertical)
  facebookReel?: MediaVariant // 1080×1920 (9:16 vertical)
  youtubeShort?: MediaVariant // 1080×1920 (9:16 vertical)
  youtube?: MediaVariant // 1920×1080 (16:9 landscape)
}

export interface MediaVariant {
  key: string // R2 object key
  url: string // Public URL
  width: number
  height: number
  size: number // bytes
}

export interface PublishDestination {
  platform: SocialPlatform
  publishedAt: Date
  postId?: string
  postUrl?: string
}

export interface CreateMediaInput {
  type: MediaType
  mimeType: string
  originalFilename: string
  hash?: string // pHash for IP protection
  variants: MediaVariants
  platformOptimized?: SocialPlatform[]
  caption?: string
  hashtags?: string[]
  altText?: string
  pieceId?: string
  tags?: string[]
  source?: MediaSource
  importedFrom?: string
}

export interface UpdateMediaInput {
  caption?: string
  hashtags?: string[]
  altText?: string
  pieceId?: string | null // null to unlink
  tags?: string[]
  isFavorite?: boolean
}

export interface MediaFilters {
  type?: MediaType
  pieceId?: string
  tags?: string[]
  isFavorite?: boolean
  hasCaption?: boolean
  notPublishedTo?: SocialPlatform
  search?: string
}

export interface MediaListOptions extends MediaFilters {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

// Upload helpers
export interface UploadRequest {
  filename: string
  contentType: string
  size: number
}

export interface UploadUrl {
  uploadUrl: string
  key: string
  expiresAt: Date
}
