import { requireTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'
import { MarketplaceListingsPage } from '@/components/marketplace/MarketplaceListingsPage'
import { MarketplaceConnectPrompt } from '@/components/marketplace/MarketplaceConnectPrompt'

export const metadata = {
  title: 'eBay Listings - MadeBuy Admin',
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

  return (
    <MarketplaceListingsPage
      platform="ebay"
      platformName="eBay"
      platformColor="bg-blue-600"
    />
  )
}
