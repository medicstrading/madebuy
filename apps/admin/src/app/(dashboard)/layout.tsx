import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/session'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

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
    <DashboardShell user={user} tenant={serializedTenant}>
      {children}
    </DashboardShell>
  )
}
