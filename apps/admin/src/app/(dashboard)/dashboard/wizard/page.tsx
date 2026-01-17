import { media, tenants } from '@madebuy/db'
import type { SocialPlatform } from '@madebuy/shared'
import { redirect } from 'next/navigation'
import { QuickLaunchWizard } from '@/components/wizard'
import { getCurrentTenant } from '@/lib/session'

export const metadata = {
  title: 'Quick Launch | MadeBuy',
  description: 'Quickly add and publish a new item',
}

export default async function WizardPage() {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/login')
  }

  // Fetch existing media for the tenant - serialize to plain objects
  const existingMediaRaw = await media.listMedia(tenant.id, { limit: 100 })
  const existingMedia = JSON.parse(JSON.stringify(existingMediaRaw))

  // Get full tenant with all fields - serialize to plain object
  const fullTenantRaw = await tenants.getTenantById(tenant.id)
  const fullTenant = JSON.parse(JSON.stringify(fullTenantRaw))

  // Determine connected social platforms from socialConnections array
  const connectedSocialPlatforms: SocialPlatform[] = []
  if (
    fullTenant?.socialConnections &&
    Array.isArray(fullTenant.socialConnections)
  ) {
    for (const conn of fullTenant.socialConnections) {
      if (conn.isActive && conn.platform) {
        connectedSocialPlatforms.push(conn.platform)
      }
    }
  }

  // Determine connected marketplaces
  // Note: These would be stored in tenant document or separate collections
  // For now, default to false - marketplaces aren't implemented yet
  const connectedMarketplaces = {
    etsy: false,
    ebay: false,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <QuickLaunchWizard
        tenant={fullTenant!}
        existingMedia={existingMedia}
        connectedSocialPlatforms={connectedSocialPlatforms}
        connectedMarketplaces={connectedMarketplaces}
      />
    </div>
  )
}
