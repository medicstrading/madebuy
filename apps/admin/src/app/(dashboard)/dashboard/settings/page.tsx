import { requireTenant } from '@/lib/session'

export const metadata = {
  title: 'Settings - MadeBuy Admin',
}

export default async function SettingsPage() {
  const tenant = await requireTenant()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account and application preferences
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">Settings options coming soon</p>
      </div>
    </div>
  )
}
