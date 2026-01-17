import { CartProvider } from '@/contexts/CartContext'
import { requireTenant } from '@/lib/tenant'

// Force dynamic rendering for all tenant routes - they require database access
export const dynamic = 'force-dynamic'

import type { ReactNode } from 'react'
import { TenantTheme } from '@/components/TenantTheme'
import { WishlistProvider } from '@/contexts/WishlistContext'

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { tenant: string }
}) {
  const tenant = await requireTenant(params.tenant)

  return (
    <TenantTheme tenant={tenant}>
      <CartProvider tenantId={tenant.id}>
        <WishlistProvider tenantId={tenant.id}>{children}</WishlistProvider>
      </CartProvider>
    </TenantTheme>
  )
}
