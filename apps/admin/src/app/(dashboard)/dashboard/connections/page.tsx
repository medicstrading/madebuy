import { requireTenant } from '@/lib/session'
import { ConnectionsPage } from '@/components/connections/ConnectionsPage'

export const metadata = {
  title: 'Connections - MadeBuy Admin',
}

export default async function Connections() {
  const tenant = await requireTenant()
  return <ConnectionsPage tenant={tenant} />
}
