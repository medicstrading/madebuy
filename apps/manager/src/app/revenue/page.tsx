import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { RevenueContent } from '@/components/revenue/RevenueContent'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function RevenuePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return <RevenueContent />
}
