import { marketplace } from '@madebuy/db'
import { MarketplaceConnectPrompt } from '@/components/marketplace/MarketplaceConnectPrompt'
import { MarketplaceListingsPage } from '@/components/marketplace/MarketplaceListingsPage'
import { requireTenant } from '@/lib/session'

export const metadata = {
  title: 'Etsy Listings - MadeBuy Admin',
}

export default async function EtsyListingsPage() {
  const tenant = await requireTenant()

  // Check if Etsy is connected
  const connection = await marketplace.getConnectionByMarketplace(
    tenant.id,
    'etsy',
  )
  const isConnected = connection && connection.status === 'connected'

  if (!isConnected) {
    return (
      <MarketplaceConnectPrompt
        platform="etsy"
        platformName="Etsy"
        platformColor="orange"
        description="Connect your Etsy shop to sync inventory, manage listings, and import your existing products."
        features={[
          'Import existing Etsy listings to your inventory',
          'Sync stock levels automatically',
          'Manage listings from one dashboard',
          'Track Etsy sales alongside other channels',
        ]}
      />
    )
  }

  return (
    <MarketplaceListingsPage
      platform="etsy"
      platformName="Etsy"
      platformColor="bg-orange-600"
    />
  )
}
