/**
 * Media - Photos and videos with platform-optimized variants
 */

import type { SocialPlatform } from './tenant'

export type MediaType = 'image' | 'video'
export type MediaSource = 'upload' | 'import'
export type VideoProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed'

/**
 * Video-specific metadata extracted during processing
 */
export interface VideoMetadata {
  duration: number              // Duration in seconds
  width: number                 // Video width in pixels
  height: number                // Video height in pixels
  codec?: string                // Video codec (e.g., 'h264', 'vp9')
  bitrate?: number              // Bitrate in bits per second
  frameRate?: number            // Frames per second
  hasAudio: boolean             // Whether video has an audio track
  thumbnailKey?: string         // R2/storage key for generated thumbnail
  thumbnailUrl?: string         // Public URL for thumbnail
}

export interface MediaItem {
  id: string
  tenantId: string

  // File info
  type: MediaType
  mimeType: string
  originalFilename: string
  sizeBytes?: number            // File size in bytes

  // IP Protection - Perceptual hash for theft detection
  hash?: string                 // pHash for image similarity detection & ownership proof

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

  // Display ordering
  displayOrder: number          // Order within piece gallery (0-based)
  isPrimary: boolean            // Primary image/video for product listing

  // Organization
  tags: string[]
  isFavorite: boolean

  // Publishing history
  publishedTo: PublishDestination[]

  // Video-specific fields
  video?: VideoMetadata
  processingStatus?: VideoProcessingStatus
  processingError?: string

  // Image analysis
  dominantColor?: string        // Hex color for loading placeholder

  // Timestamps
  createdAt: Date
  updatedAt: Date

  // Source tracking
  source: MediaSource
  importedFrom?: string         // URL if imported
}

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
  sizeBytes?: number
  hash?: string               // pHash for IP protection
  variants: MediaVariants
  platformOptimized?: SocialPlatform[]
  caption?: string
  hashtags?: string[]
  altText?: string
  pieceId?: string
  displayOrder?: number       // Order in piece gallery
  isPrimary?: boolean         // Primary image for listing
  tags?: string[]
  source?: MediaSource
  importedFrom?: string
  // Video-specific
  video?: VideoMetadata
  processingStatus?: VideoProcessingStatus
  dominantColor?: string
}

export interface UpdateMediaInput {
  caption?: string
  hashtags?: string[]
  altText?: string
  pieceId?: string | null     // null to unlink
  displayOrder?: number
  isPrimary?: boolean
  tags?: string[]
  isFavorite?: boolean
  // Video processing updates
  video?: Partial<VideoMetadata>
  processingStatus?: VideoProcessingStatus
  processingError?: string
  dominantColor?: string
}

export interface MediaFilters {
  type?: MediaType
  pieceId?: string
  tags?: string[]
  isFavorite?: boolean
  hasCaption?: boolean
  notPublishedTo?: SocialPlatform
  search?: string
  processingStatus?: VideoProcessingStatus
  isPrimary?: boolean
}

export interface MediaListOptions extends MediaFilters {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'displayOrder'
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

// ============================================================================
// Media Validation Constants
// ============================================================================

/** Supported image MIME types */
export const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

/** Supported video MIME types */
export const VALID_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',  // MOV
  'video/webm',
] as const

/** Maximum file sizes in bytes */
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024    // 20MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024   // 100MB

/** Maximum video duration in seconds */
export const MAX_VIDEO_DURATION = 60              // 60 seconds

/** Maximum media items per piece */
export const MAX_MEDIA_PER_PIECE = 20

/** Video file extensions */
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'] as const

/** Image file extensions */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const

// ============================================================================
// Reorder Types
// ============================================================================

export interface ReorderMediaInput {
  mediaIds: string[]          // Array of media IDs in desired order
}

export interface ReorderResult {
  success: boolean
  updatedCount: number
}
