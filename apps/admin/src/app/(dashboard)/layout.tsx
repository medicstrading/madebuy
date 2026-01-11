import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/session'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { RegionalProvider } from '@/components/providers/RegionalProvider'
import { marketplace } from '@madebuy/db'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Single call - getCurrentTenant already checks auth
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  // Fetch marketplace connections to determine sidebar visibility
  const [ebayConnection, etsyConnection] = await Promise.all([
    marketplace.getConnectionByMarketplace(tenant.id, 'ebay').catch(() => null),
    marketplace.getConnectionByMarketplace(tenant.id, 'etsy').catch(() => null),
  ])

  const marketplaceConnections = {
    ebay: ebayConnection?.status === 'connected' && ebayConnection?.enabled === true,
    etsy: etsyConnection?.status === 'connected' && etsyConnection?.enabled === true,
  }

  // Serialize to plain objects for client components (avoid MongoDB ObjectId/Date hydration issues)
  const serializedTenant = {
    id: tenant.id,
    slug: tenant.slug,
    businessName: tenant.businessName || '',
    plan: tenant.plan || 'free',
  }

  const user = {
    name: tenant.businessName || '',
    email: tenant.email || '',
  }

  return (
    <RegionalProvider settings={tenant.regionalSettings || null}>
      <DashboardShell user={user} tenant={serializedTenant} marketplaceConnections={marketplaceConnections}>
        {children}
      </DashboardShell>
    </RegionalProvider>
  )
}
