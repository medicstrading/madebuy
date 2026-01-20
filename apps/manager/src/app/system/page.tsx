import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { SystemContent } from '@/components/system/SystemContent'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function SystemPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <SystemContent />
}
