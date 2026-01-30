import { marketplace, media, pieces } from '@madebuy/db'
import { EbayMarketplacePage } from '@/components/marketplace/EbayMarketplacePage'
import { MarketplaceConnectPrompt } from '@/components/marketplace/MarketplaceConnectPrompt'
import { requireTenant } from '@/lib/session'

export const metadata = {
  title: 'eBay Marketplace - MadeBuy Admin',
}

export default async function EbayListingsPage() {
  const tenant = await requireTenant()

  // Check if eBay is connected
  const connection = await marketplace.getConnectionByMarketplace(
    tenant.id,
    'ebay',
  )
  const isConnected = connection && connection.status === 'connected'

  if (!isConnected) {
    return (
      <MarketplaceConnectPrompt
        platform="ebay"
        platformName="eBay"
        platformColor="blue"
        description="Connect your eBay seller account to sync inventory, manage listings, and import your existing products."
        features={[
          'Import existing eBay listings to your inventory',
          'Sync stock levels automatically',
          'Manage listings from one dashboard',
          'Track eBay sales alongside other channels',
        ]}
      />
    )
  }

  // Fetch inventory items available for listing
  const result = await pieces.listPieces(tenant.id, { limit: 100 })
  const inventoryItems = 'data' in result ? result.data : result

  // Collect all media IDs to fetch in one batch
  const allMediaIds = inventoryItems
    .flatMap((item) => item.mediaIds || [])
    .filter((id, index, arr) => arr.indexOf(id) === index) // dedupe

  // Fetch all media in one batch
  const mediaItems =
    allMediaIds.length > 0
      ? await media.getMediaByIds(tenant.id, allMediaIds)
      : []

  // Create a map of mediaId -> thumbnail URL
  const mediaUrlMap = new Map<string, string>()
  for (const m of mediaItems) {
    // Use thumb variant if available, otherwise large or original
    const url =
      m.variants?.thumb?.url ||
      m.variants?.large?.url ||
      m.variants?.original?.url
    if (url) {
      mediaUrlMap.set(m.id, url)
    }
  }

  // Serialize connection for client component
  const serializedConnection = connection
    ? {
        id: connection.id || '',
        status: connection.status,
        accountId: connection.sellerId || '',
        accountName: connection.shopName || '',
        lastSync: connection.lastSyncAt?.toISOString() || null,
        tokenExpiresAt: connection.tokenExpiresAt?.toISOString() || null,
      }
    : null

  // Serialize inventory items with actual thumbnail URLs
  const serializedInventory = inventoryItems.map((item) => {
    // Get thumbnail URL from first media ID
    const primaryMediaId = item.primaryMediaId || item.mediaIds?.[0]
    const thumbnailUrl = primaryMediaId
      ? mediaUrlMap.get(primaryMediaId)
      : undefined

    return {
      id: item.id || '',
      name: item.name || '',
      price: item.price || 0,
      quantity: item.stock || 0,
      thumbnailUrl: thumbnailUrl || null,
      status: item.status || 'draft',
    }
  })

  return (
    <EbayMarketplacePage
      connection={serializedConnection}
      inventoryItems={serializedInventory}
    />
  )
}
