import { requireTenant } from '@/lib/session'
import { marketplace, pieces } from '@madebuy/db'
import { EbayMarketplacePage } from '@/components/marketplace/EbayMarketplacePage'
import { MarketplaceConnectPrompt } from '@/components/marketplace/MarketplaceConnectPrompt'

export const metadata = {
  title: 'eBay Marketplace - MadeBuy Admin',
}

export default async function EbayListingsPage() {
  const tenant = await requireTenant()

  // Check if eBay is connected
  const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
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
  const inventoryItems = await pieces.listPieces(tenant.id, { limit: 100 })

  // Serialize connection for client component
  const serializedConnection = connection ? {
    id: connection.id || '',
    status: connection.status,
    accountId: connection.sellerId || '',
    accountName: connection.shopName || '',
    lastSync: connection.lastSyncAt?.toISOString() || null,
    tokenExpiresAt: connection.tokenExpiresAt?.toISOString() || null,
  } : null

  // Serialize inventory items for client component
  const serializedInventory = inventoryItems.map(item => ({
    id: item.id || '',
    name: item.name || '',
    price: item.price || 0,
    quantity: item.stock || 0,
    images: item.mediaIds || [],
    status: item.status || 'draft',
  }))

  return (
    <EbayMarketplacePage
      connection={serializedConnection}
      inventoryItems={serializedInventory}
    />
  )
}
