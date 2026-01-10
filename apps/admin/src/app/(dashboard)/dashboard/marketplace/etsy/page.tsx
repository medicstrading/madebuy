import { requireTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'
import { redirect } from 'next/navigation'
import { MarketplaceListingsPage } from '@/components/marketplace/MarketplaceListingsPage'

export const metadata = {
  title: 'Etsy Listings - MadeBuy Admin',
}

export default async function EtsyListingsPage() {
  const tenant = await requireTenant()

  // Check if Etsy is connected
  const connection = await marketplace.getConnectionByMarketplace(tenant.id, 'etsy')
  if (!connection || connection.status !== 'connected') {
    redirect('/dashboard/connections?tab=marketplaces')
  }

  return (
    <MarketplaceListingsPage
      platform="etsy"
      platformName="Etsy"
      platformColor="bg-orange-600"
    />
  )
}
