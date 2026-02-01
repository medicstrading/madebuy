import { orders } from '@madebuy/db'
import { notFound } from 'next/navigation'
import { PackingSlip } from '@/components/orders/PackingSlip'
import { requireTenant } from '@/lib/session'
import { AutoPrint } from './AutoPrint'

interface PackingSlipPageProps {
  params: { id: string }
}

export default async function PackingSlipPage({
  params,
}: PackingSlipPageProps) {
  const tenant = await requireTenant()
  const order = await orders.getOrder(tenant.id, params.id)

  if (!order) {
    notFound()
  }

  return (
    <>
      <AutoPrint />
      <PackingSlip
        order={order}
        tenant={{
          businessName: tenant.businessName,
          location: tenant.location,
          phone: tenant.phone,
          email: tenant.email,
        }}
      />
    </>
  )
}
