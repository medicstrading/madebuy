import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { DashboardContent } from '@/components/dashboard/DashboardContent'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <DashboardContent />
}
