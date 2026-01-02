import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/session'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar tenant={serializedTenant} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} tenant={serializedTenant} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
