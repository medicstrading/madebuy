import { pieces, media } from '@madebuy/db'
import type { Piece, PieceWithMedia } from '@madebuy/shared'

// Re-export type for use in components
export type { PieceWithMedia }

/**
 * Populate a piece with its media objects
 */
export async function populatePieceWithMedia(piece: Piece): Promise<PieceWithMedia> {
  // Fetch all media for this piece
  const allImages = await Promise.all(
    piece.mediaIds.map(id => media.getMedia(piece.tenantId, id))
  )

  // Filter out null results
  const validImages = allImages.filter(img => img !== null)

  // Find primary image
  const primaryImage = piece.primaryMediaId
    ? validImages.find(img => img && img.id === piece.primaryMediaId) || validImages[0]
    : validImages[0]

  // Combine materials
  const materials = [
    ...piece.stones,
    ...piece.metals,
    ...piece.techniques,
  ].filter(Boolean)

  return {
    ...piece,
    primaryImage,
    allImages: validImages as any[],
    materials,
  }
}

/**
 * Populate multiple pieces with their media objects
 */
export async function populatePiecesWithMedia(pieces: Piece[]): Promise<PieceWithMedia[]> {
  return Promise.all(pieces.map(piece => populatePieceWithMedia(piece)))
}
