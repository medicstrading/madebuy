import { requireTenant } from '@/lib/session'
import { pieces, media, collections } from '@madebuy/db'
import { WebsiteListingsClient } from '@/components/marketplace/WebsiteListingsClient'

export const metadata = {
  title: 'Website Listings - MadeBuy Admin',
}

export default async function WebsiteListingsPage() {
  const tenant = await requireTenant()

  // Fetch all pieces, media, and collections
  const [allPieces, allMedia, collectionsResult] = await Promise.all([
    pieces.listPieces(tenant.id),
    media.listMedia(tenant.id),
    collections.listCollections(tenant.id),
  ])
  const allCollections = collectionsResult.items

  // Create media lookup map for thumbnails
  const mediaMap = new Map(
    allMedia.map(m => [m.id, m.variants.thumb?.url || m.variants.original?.url])
  )

  // Create piece → collections map
  const pieceCollectionsMap: Record<string, { id: string; name: string }[]> = {}
  for (const collection of allCollections) {
    for (const pieceId of collection.pieceIds || []) {
      if (!pieceCollectionsMap[pieceId]) {
        pieceCollectionsMap[pieceId] = []
      }
      pieceCollectionsMap[pieceId].push({ id: collection.id, name: collection.name })
    }
  }

  // Add thumbnail URLs to pieces
  const piecesWithThumbnails = allPieces.map(piece => ({
    ...piece,
    thumbnailUrl: piece.primaryMediaId
      ? mediaMap.get(piece.primaryMediaId)
      : piece.mediaIds?.[0]
        ? mediaMap.get(piece.mediaIds[0])
        : undefined,
  }))

  // Serialize collections for client (strip MongoDB-specific fields)
  const serializedCollections = allCollections.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }))

  return (
    <WebsiteListingsClient
      pieces={piecesWithThumbnails}
      tenantSlug={tenant.slug}
      collections={serializedCollections}
      pieceCollectionsMap={pieceCollectionsMap}
    />
  )
}
