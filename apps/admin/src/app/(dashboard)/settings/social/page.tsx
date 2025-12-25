import { requireTenant } from '@/lib/session'
import { SocialConnectionManager } from '@/components/settings/SocialConnectionManager'

export const metadata = {
  title: 'Social Media Connections - Settings',
}

export default async function SocialSettingsPage() {
  const tenant = await requireTenant()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Social Media Connections</h1>
      <p className="mt-1 text-gray-600">
        Connect your social media accounts to publish directly from MadeBuy
      </p>

      <div className="mt-8">
        <SocialConnectionManager tenant={tenant} />
      </div>
    </div>
  )
}
