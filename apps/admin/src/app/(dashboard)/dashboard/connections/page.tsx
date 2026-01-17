import { ConnectionsPage } from '@/components/connections/ConnectionsPage'
import { requireTenant } from '@/lib/session'

export const metadata = {
  title: 'Connections - MadeBuy Admin',
}

export default async function Connections() {
  const tenant = await requireTenant()
  return <ConnectionsPage tenant={tenant} />
}
