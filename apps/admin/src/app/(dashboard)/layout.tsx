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

  // Derive user info from tenant to avoid duplicate DB call
  const user = {
    name: tenant.businessName || tenant.storeName || '',
    email: tenant.email || '',
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar tenant={tenant} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} tenant={tenant} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
