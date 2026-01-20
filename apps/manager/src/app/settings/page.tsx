import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { SettingsContent } from '@/components/settings/SettingsContent'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <SettingsContent />
}
