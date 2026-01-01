import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/session';
import { accountingConnections } from '@madebuy/db';

// GET - Get current mappings
export async function GET() {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connection = await accountingConnections.getConnection(tenant.id, 'xero');
  if (!connection) {
    return NextResponse.json({ error: 'Xero not connected' }, { status: 400 });
  }

  return NextResponse.json({
    mappings: connection.accountMappings,
    lastSyncAt: connection.lastSyncAt,
    status: connection.status
  });
}

// PUT - Update mappings
export async function PUT(request: NextRequest) {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { productSales, shippingIncome, platformFees, paymentFees, bankAccount } = body;

  // Validate all required fields
  if (!productSales || !shippingIncome || !platformFees || !paymentFees || !bankAccount) {
    return NextResponse.json({ error: 'All mappings are required' }, { status: 400 });
  }

  await accountingConnections.updateConnection(tenant.id, 'xero', {
    accountMappings: {
      productSales,
      shippingIncome,
      platformFees,
      paymentFees,
      bankAccount
    }
  });

  return NextResponse.json({ success: true });
}
