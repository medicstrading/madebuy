import { requireTenant } from '@/lib/tenant'
import { CartProvider } from '@/contexts/CartContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import { TenantTheme } from '@/components/TenantTheme'
import { ReactNode } from 'react'

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
        <WishlistProvider tenantId={tenant.id}>
          {children}
        </WishlistProvider>
      </CartProvider>
    </TenantTheme>
  )
}
