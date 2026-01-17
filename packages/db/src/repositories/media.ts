import type {
  CreateMediaInput,
  MediaFilters,
  MediaItem,
  ReorderResult,
  UpdateMediaInput,
  VideoProcessingStatus,
} from '@madebuy/shared'
import { nanoid } from 'nanoid'
import { getDatabase } from '../client'

// Database record type
interface MediaDbRecord extends MediaItem {
  _id?: unknown
}

export async function createMedia(
  tenantId: string,
  data: CreateMediaInput,
): Promise<MediaItem> {
  const db = await getDatabase()

  const media: MediaItem = {
    id: nanoid(),
    tenantId,
    type: data.type,
    mimeType: data.mimeType,
    originalFilename: data.originalFilename,
    sizeBytes: data.sizeBytes,
    variants: data.variants,
    platformOptimized: data.platformOptimized || [],
    caption: data.caption,
    hashtags: data.hashtags || [],
    altText: data.altText,
    pieceId: data.pieceId,
    displayOrder: data.displayOrder ?? 0,
    isPrimary: data.isPrimary ?? false,
    tags: data.tags || [],
    isFavorite: false,
    publishedTo: [],
    source: data.source || 'upload',
    importedFrom: data.importedFrom,
    // Video-specific fields
    video: data.video,
    processingStatus: data.processingStatus,
    dominantColor: data.dominantColor,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('media').insertOne(media)
  return media
}

export async function getMedia(
  tenantId: string,
  id: string,
): Promise<MediaItem | null> {
  const db = await getDatabase()
  return (await db
    .collection('media')
    .findOne({ tenantId, id })) as MediaItem | null
}

// Maximum items to return in a single query (prevents memory issues)
const MAX_QUERY_LIMIT = 500

export async function listMedia(
  tenantId: string,
  filters?: MediaFilters & {
    sortBy?: 'createdAt' | 'updatedAt' | 'displayOrder'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
  },
): Promise<MediaItem[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.type) {
    query.type = filters.type
  }

  if (filters?.pieceId) {
    query.pieceId = filters.pieceId
  }

  if (filters?.isFavorite !== undefined) {
    query.isFavorite = filters.isFavorite
  }

  if (filters?.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags }
  }

  if (filters?.processingStatus) {
    query.processingStatus = filters.processingStatus
  }

  if (filters?.isPrimary !== undefined) {
    query.isPrimary = filters.isPrimary
  }

  // Determine sort field and order
  const sortField = filters?.sortBy || 'createdAt'
  const sortOrder = filters?.sortOrder === 'asc' ? 1 : -1

  // Apply pagination with maximum limit
  const limit = Math.min(filters?.limit || MAX_QUERY_LIMIT, MAX_QUERY_LIMIT)
  const offset = filters?.offset || 0

  const results = await db
    .collection('media')
    .find(query)
    .sort({ [sortField]: sortOrder })
    .skip(offset)
    .limit(limit)
    .toArray()

  return results as unknown as MediaItem[]
}

export async function updateMedia(
  tenantId: string,
  id: string,
  updates: UpdateMediaInput,
): Promise<void> {
  const db = await getDatabase()
  await db.collection('media').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    },
  )
}

export async function deleteMedia(tenantId: string, id: string): Promise<void> {
  const db = await getDatabase()
  await db.collection('media').deleteOne({ tenantId, id })
}

export async function getMediaByIds(
  tenantId: string,
  ids: string[],
): Promise<MediaItem[]> {
  const db = await getDatabase()
  const results = await db
    .collection('media')
    .find({ tenantId, id: { $in: ids } })
    .toArray()

  return results as unknown as MediaItem[]
}

export async function addPublishDestination(
  tenantId: string,
  mediaId: string,
  destination: MediaItem['publishedTo'][0],
): Promise<void> {
  const db = await getDatabase()
  await db.collection('media').updateOne(
    { tenantId, id: mediaId },
    {
      $addToSet: { publishedTo: destination },
      $set: { updatedAt: new Date() },
    },
  )
}

export async function countMedia(tenantId: string): Promise<number> {
  const db = await getDatabase()
  return await db.collection('media').countDocuments({ tenantId })
}

// ============================================================================
// Display Order & Primary Media Functions
// ============================================================================

/**
 * Update display order for multiple media items atomically
 * @param tenantId - Tenant ID
 * @param pieceId - Piece ID
 * @param orderedIds - Array of media IDs in desired order
 */
export async function updateDisplayOrder(
  tenantId: string,
  pieceId: string,
  orderedIds: string[],
): Promise<ReorderResult> {
  const db = await getDatabase()

  // Use bulkWrite for atomic updates
  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { tenantId, id, pieceId },
      update: {
        $set: {
          displayOrder: index,
          isPrimary: index === 0, // First item is always primary
          updatedAt: new Date(),
        },
      },
    },
  }))

  const result = await db.collection('media').bulkWrite(bulkOps)

  return {
    success:
      result.modifiedCount > 0 || result.matchedCount === orderedIds.length,
    updatedCount: result.modifiedCount,
  }
}

/**
 * Get all media for a piece, ordered by displayOrder
 * @param tenantId - Tenant ID
 * @param pieceId - Piece ID
 */
export async function getMediaByPiece(
  tenantId: string,
  pieceId: string,
): Promise<MediaItem[]> {
  const db = await getDatabase()

  const results = await db
    .collection('media')
    .find({ tenantId, pieceId })
    .sort({ displayOrder: 1 })
    .toArray()

  return results as unknown as MediaItem[]
}

/**
 * Set a specific media item as primary for a piece
 * @param tenantId - Tenant ID
 * @param pieceId - Piece ID
 * @param mediaId - ID of media to set as primary
 */
export async function setPrimaryMedia(
  tenantId: string,
  pieceId: string,
  mediaId: string,
): Promise<void> {
  const db = await getDatabase()

  // First, unset primary on all media for this piece
  await db
    .collection('media')
    .updateMany(
      { tenantId, pieceId },
      { $set: { isPrimary: false, updatedAt: new Date() } },
    )

  // Then set the specified media as primary
  await db
    .collection('media')
    .updateOne(
      { tenantId, id: mediaId, pieceId },
      { $set: { isPrimary: true, displayOrder: 0, updatedAt: new Date() } },
    )
}

// ============================================================================
// Video Processing Functions
// ============================================================================

/**
 * Get videos that need processing (pending status)
 */
export async function getVideosPendingProcessing(): Promise<MediaItem[]> {
  const db = await getDatabase()

  const results = await db
    .collection('media')
    .find({
      type: 'video',
      processingStatus: 'pending',
    })
    .sort({ createdAt: 1 }) // Process oldest first
    .limit(10) // Batch of 10
    .toArray()

  return results as unknown as MediaItem[]
}

/**
 * Update video processing status
 */
export async function updateVideoProcessingStatus(
  tenantId: string,
  mediaId: string,
  status: VideoProcessingStatus,
  error?: string,
): Promise<void> {
  const db = await getDatabase()

  const updates: Partial<MediaDbRecord> = {
    processingStatus: status,
    updatedAt: new Date(),
  }

  if (error) {
    updates.processingError = error
  } else if (status === 'complete') {
    // Clear any previous error on success
    updates.processingError = undefined
  }

  await db
    .collection('media')
    .updateOne({ tenantId, id: mediaId }, { $set: updates })
}

/**
 * Update video metadata after processing
 */
export async function updateVideoMetadata(
  tenantId: string,
  mediaId: string,
  videoMetadata: MediaItem['video'],
  thumbnailVariants?: MediaItem['variants'],
): Promise<void> {
  const db = await getDatabase()

  const updates: Partial<MediaDbRecord> = {
    video: videoMetadata,
    processingStatus: 'complete' as VideoProcessingStatus,
    updatedAt: new Date(),
  }

  // If thumbnail variants provided, merge them with existing variants
  if (thumbnailVariants) {
    const media = await getMedia(tenantId, mediaId)
    if (media) {
      updates.variants = {
        ...media.variants,
        ...thumbnailVariants,
      }
    }
  }

  await db
    .collection('media')
    .updateOne({ tenantId, id: mediaId }, { $set: updates })
}

/**
 * Get next display order for a piece
 */
export async function getNextDisplayOrder(
  tenantId: string,
  pieceId: string,
): Promise<number> {
  const db = await getDatabase()

  const result = await db
    .collection('media')
    .find({ tenantId, pieceId })
    .sort({ displayOrder: -1 })
    .limit(1)
    .toArray()

  if (result.length === 0) {
    return 0
  }

  return (result[0].displayOrder ?? -1) + 1
}

/**
 * Delete multiple media items
 */
export async function deleteMediaBulk(
  tenantId: string,
  mediaIds: string[],
): Promise<number> {
  const db = await getDatabase()

  const result = await db.collection('media').deleteMany({
    tenantId,
    id: { $in: mediaIds },
  })

  return result.deletedCount
}
