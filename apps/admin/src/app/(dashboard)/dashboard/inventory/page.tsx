import { requireTenant } from '@/lib/session'
import { pieces, materials, media, collections } from '@madebuy/db'
import { InventoryPageClient } from '@/components/inventory/InventoryPageClient'

export const metadata = {
  title: 'Inventory - MadeBuy Admin',
}

export default async function InventoryPage() {
  const tenant = await requireTenant()

  // Fetch all data needed for all tabs in parallel
  const [allPieces, lowStockPieces, allMedia, collectionsResult] = await Promise.all([
    pieces.listPieces(tenant.id),
    pieces.getLowStockPieces(tenant.id),
    media.listMedia(tenant.id),
    collections.listCollections(tenant.id),
  ])

  const allCollections = collectionsResult.items

  // Create media lookup map (use thumb if available, fallback to original)
  const mediaMap = new Map(
    allMedia.map(m => [m.id, m.variants.thumb?.url || m.variants.original?.url])
  )

  // Batch fetch COGS for all pieces
  const pieceIds = allPieces.map(p => p.id)
  const cogsMap = await materials.calculateBatchCOGS(tenant.id, pieceIds)

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

  // Add COGS and thumbnail URLs to pieces
  const piecesWithExtras = allPieces.map(piece => ({
    ...piece,
    cogs: cogsMap.get(piece.id) || 0,
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

  // Low stock counts
  const outOfStockCount = lowStockPieces.filter(p => p.stock === 0).length
  const lowStockCount = lowStockPieces.length

  return (
    <InventoryPageClient
      pieces={piecesWithExtras}
      collections={allCollections}
      serializedCollections={serializedCollections}
      pieceCollectionsMap={pieceCollectionsMap}
      tenantSlug={tenant.slug}
      lowStockCount={lowStockCount}
      outOfStockCount={outOfStockCount}
    />
  )
}
