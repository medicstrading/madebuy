import { redirect } from 'next/navigation'
import { requireTenant } from '@/lib/session'
import { marketplace } from '@madebuy/db'

export const metadata = {
  title: 'Marketplaces - MadeBuy Admin',
}

/**
 * Marketplace index page - redirects to the first connected marketplace
 * or eBay by default
 */
export default async function MarketplacePage() {
  const tenant = await requireTenant()

  // Check which marketplaces are connected
  const ebayConnection = await marketplace.getConnectionByMarketplace(tenant.id, 'ebay')
  const etsyConnection = await marketplace.getConnectionByMarketplace(tenant.id, 'etsy')

  const ebayConnected = ebayConnection && ebayConnection.status === 'connected'
  const etsyConnected = etsyConnection && etsyConnection.status === 'connected'

  // Redirect to connected marketplace, or eBay by default
  if (ebayConnected) {
    redirect('/dashboard/marketplace/ebay')
  } else if (etsyConnected) {
    redirect('/dashboard/marketplace/etsy')
  } else {
    // Default to eBay connect page
    redirect('/dashboard/marketplace/ebay')
  }
}
