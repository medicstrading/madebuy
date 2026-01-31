import { CartProvider } from '@/contexts/CartContext'
import { requireTenant } from '@/lib/tenant'

// Enable ISR with 2-minute revalidation for tenant storefronts
// Tenant data rarely changes; cart/wishlist handled client-side
export const revalidate = 120

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
