/**
 * Media - Photos and videos with platform-optimized variants
 */
import type { SocialPlatform } from './tenant'
export interface MediaItem {
  id: string
  tenantId: string
  type: MediaType
  mimeType: string
  originalFilename: string
  variants: MediaVariants
  platformOptimized: SocialPlatform[]
  caption?: string
  hashtags?: string[]
  altText?: string
  pieceId?: string
  tags: string[]
  isFavorite: boolean
  publishedTo: PublishDestination[]
  createdAt: Date
  updatedAt: Date
  source: MediaSource
  importedFrom?: string
}
export type MediaType = 'image' | 'video'
export type MediaSource = 'upload' | 'import'
export interface MediaVariants {
  original: MediaVariant
  large?: MediaVariant
  thumb?: MediaVariant
  instagramFeed?: MediaVariant
  facebookFeed?: MediaVariant
  pinterest?: MediaVariant
  instagramReel?: MediaVariant
  tiktok?: MediaVariant
  facebookReel?: MediaVariant
  youtubeShort?: MediaVariant
  youtube?: MediaVariant
}
export interface MediaVariant {
  key: string
  url: string
  width: number
  height: number
  size: number
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
  pieceId?: string | null
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
