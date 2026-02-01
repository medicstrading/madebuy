import { marketplace } from '@madebuy/db'
import { unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import { CelebrationProvider } from '@/components/celebrations/CelebrationProvider'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { RegionalProvider } from '@/components/providers/RegionalProvider'
import { getCurrentTenant } from '@/lib/session'

// Allow Next.js to cache this layout for 60 seconds (replaces force-dynamic)
export const revalidate = 60

// Cache marketplace connections - they rarely change (5 minute cache)
const getCachedMarketplaceConnections = unstable_cache(
  async (tenantId: string) => {
    const [ebayConnection, etsyConnection] = await Promise.all([
      marketplace
        .getConnectionByMarketplace(tenantId, 'ebay')
        .catch(() => null),
      marketplace
        .getConnectionByMarketplace(tenantId, 'etsy')
        .catch(() => null),
    ])

    return {
      ebay: ebayConnection?.status === 'connected',
      etsy: etsyConnection?.status === 'connected',
    }
  },
  ['marketplace-connections'],
  { revalidate: 300, tags: ['marketplace'] }, // 5 minute cache
)

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // getCurrentTenant is now request-cached - safe to call multiple times
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  // Use cached marketplace connections (5 minute cache)
  const marketplaceConnections = await getCachedMarketplaceConnections(
    tenant.id,
  )

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
      <CelebrationProvider checkOnMount={true}>
        <DashboardShell
          user={user}
          tenant={serializedTenant}
          marketplaceConnections={marketplaceConnections}
        >
          {children}
        </DashboardShell>
      </CelebrationProvider>
    </RegionalProvider>
  )
}
