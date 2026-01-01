import { NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/session';
import { accountingConnections } from '@madebuy/db';

export async function POST() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await accountingConnections.deleteConnection(tenant.id, 'xero');

  return NextResponse.json({ success: true });
}
