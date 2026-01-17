import { media, pieces } from '@madebuy/db'
import type { MediaItem, Piece, PieceWithMedia } from '@madebuy/shared'
import { cache } from 'react'

// Re-export type for use in components
export type { PieceWithMedia }

/**
 * Get piece by slug (cached)
 * Wrapped with React cache() to deduplicate requests during a single render pass
 */
export const getPieceBySlug = cache(
  async (tenantId: string, slug: string): Promise<Piece | null> => {
    return await pieces.getPieceBySlug(tenantId, slug)
  },
)

/**
 * Get piece by ID (cached)
 * Wrapped with React cache() to deduplicate requests during a single render pass
 */
export const getPieceById = cache(
  async (tenantId: string, id: string): Promise<Piece | null> => {
    return await pieces.getPiece(tenantId, id)
  },
)

/**
 * Populate a piece with its media objects (uses batch-fetched media map)
 */
function populatePieceFromMediaMap(
  piece: Piece,
  mediaMap: Map<string, MediaItem>,
): PieceWithMedia {
  // Get media from pre-fetched map
  const allImages = piece.mediaIds
    .map((id) => mediaMap.get(id))
    .filter((img): img is MediaItem => img !== undefined)

  // Find primary image
  const primaryImage = piece.primaryMediaId
    ? allImages.find((img) => img.id === piece.primaryMediaId) || allImages[0]
    : allImages[0]

  // Combine materials (handle undefined arrays)
  const materials = [
    ...(piece.stones || []),
    ...(piece.metals || []),
    ...(piece.techniques || []),
  ].filter(Boolean)

  return {
    ...piece,
    primaryImage,
    allImages: allImages as any[],
    materials,
  }
}

/**
 * Populate a single piece with its media objects
 * Note: For multiple pieces, use populatePiecesWithMedia for better performance
 */
export async function populatePieceWithMedia(
  piece: Piece,
): Promise<PieceWithMedia> {
  if (piece.mediaIds.length === 0) {
    return populatePieceFromMediaMap(piece, new Map())
  }

  // Batch fetch all media for this piece in one query
  const allMedia = await media.getMediaByIds(piece.tenantId, piece.mediaIds)
  const mediaMap = new Map(allMedia.map((m) => [m.id, m]))

  return populatePieceFromMediaMap(piece, mediaMap)
}

/**
 * Populate multiple pieces with their media objects
 * Uses batch fetching to avoid N+1 queries
 */
export async function populatePiecesWithMedia(
  piecesArr: Piece[],
): Promise<PieceWithMedia[]> {
  if (piecesArr.length === 0) return []

  // All pieces should belong to the same tenant in storefront context
  const tenantId = piecesArr[0].tenantId

  // Collect all unique media IDs from all pieces
  const allMediaIds = [...new Set(piecesArr.flatMap((p) => p.mediaIds))]

  if (allMediaIds.length === 0) {
    return piecesArr.map((piece) => populatePieceFromMediaMap(piece, new Map()))
  }

  // Batch fetch all media in a single query (fixes N+1 problem)
  const allMedia = await media.getMediaByIds(tenantId, allMediaIds)
  const mediaMap = new Map(allMedia.map((m) => [m.id, m]))

  // Populate each piece using the pre-fetched media map
  return piecesArr.map((piece) => populatePieceFromMediaMap(piece, mediaMap))
}
