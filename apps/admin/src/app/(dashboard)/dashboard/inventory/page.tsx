import { collections, materials, media, pieces } from '@madebuy/db'
import { unstable_cache } from 'next/cache'
import { InventoryPageClient } from '@/components/inventory/InventoryPageClient'
import { requireTenant } from '@/lib/session'

export const metadata = {
  title: 'Inventory - MadeBuy Admin',
}

// Cache inventory data for 30 seconds - balances freshness with performance
const getCachedInventoryData = unstable_cache(
  async (tenantId: string) => {
    // Fetch all data needed for all tabs in parallel
    // Note: For very large inventories (500+ items), consider implementing
    // pagination in the client component instead
    const [allPieces, lowStockPieces, allMedia, collectionsResult] =
      await Promise.all([
        pieces.listPieces(tenantId, { limit: 500 }), // Reasonable limit for UI performance
        pieces.getLowStockPieces(tenantId),
        media.listMedia(tenantId, { limit: 1000 }),
        collections.listCollections(tenantId),
      ])
    return { allPieces, lowStockPieces, allMedia, collectionsResult }
  },
  ['inventory-data'],
  { revalidate: 30, tags: ['inventory'] },
)

export default async function InventoryPage() {
  const tenant = await requireTenant()

  const { allPieces, lowStockPieces, allMedia, collectionsResult } =
    await getCachedInventoryData(tenant.id)

  const allCollections = collectionsResult.items

  // Extract pieces array from paginated result
  const piecesArray = 'data' in allPieces ? allPieces.data : allPieces

  // Create media lookup map (use thumb if available, fallback to original)
  const mediaMap = new Map(
    allMedia.map((m) => [
      m.id,
      m.variants.thumb?.url || m.variants.original?.url,
    ]),
  )

  // Batch fetch COGS for all pieces
  const pieceIds = piecesArray.map((p) => p.id)
  const cogsMap = await materials.calculateBatchCOGS(tenant.id, pieceIds)

  // Create piece → collections map
  const pieceCollectionsMap: Record<string, { id: string; name: string }[]> = {}
  for (const collection of allCollections) {
    for (const pieceId of collection.pieceIds || []) {
      if (!pieceCollectionsMap[pieceId]) {
        pieceCollectionsMap[pieceId] = []
      }
      pieceCollectionsMap[pieceId].push({
        id: collection.id,
        name: collection.name,
      })
    }
  }

  // Add COGS and thumbnail URLs to pieces
  const piecesWithExtras = piecesArray.map((piece) => ({
    ...piece,
    cogs: cogsMap.get(piece.id) || 0,
    thumbnailUrl: piece.primaryMediaId
      ? mediaMap.get(piece.primaryMediaId)
      : piece.mediaIds?.[0]
        ? mediaMap.get(piece.mediaIds[0])
        : undefined,
  }))

  // Serialize collections for client (strip MongoDB-specific fields)
  const serializedCollections = allCollections.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }))

  // Low stock counts
  const outOfStockCount = lowStockPieces.filter((p) => p.stock === 0).length
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
