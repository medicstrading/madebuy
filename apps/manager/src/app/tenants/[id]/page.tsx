import { TenantDetailContent } from '@/components/tenants/TenantDetailContent'

export const metadata = {
  title: 'Tenant Detail - MadeBuy Manager',
  description: 'View tenant details',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params
  return <TenantDetailContent tenantId={id} />
}
