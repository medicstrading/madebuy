import { requireTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'
import { redirect } from 'next/navigation'
import { MarketplaceListingsPage } from '@/components/marketplace/MarketplaceListingsPage'

export const metadata = {
  title: 'eBay Listings - MadeBuy Admin',
}

export default async function EbayListingsPage() {
  const tenant = await requireTenant()

  // Check if eBay is connected
  const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
  if (!connection || connection.status !== 'connected') {
    redirect('/dashboard/connections?tab=marketplaces')
  }

  return (
    <MarketplaceListingsPage
      platform="ebay"
      platformName="eBay"
      platformColor="bg-blue-600"
    />
  )
}
