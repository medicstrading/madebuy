import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/session';
import { accountingConnections, orders, tenants } from '@madebuy/db';
import { syncOrderToXero } from '@madebuy/shared/src/xero';

/**
 * POST /api/xero/sync
 * Trigger manual sync of recent orders to Xero
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Xero connection
    const connection = await accountingConnections.getConnection(tenant.id, 'xero');
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json(
        { error: 'Xero not connected' },
        { status: 400 }
      );
    }

    // Check if account mappings are configured
    if (!connection.accountMappings?.productSales || !connection.accountMappings?.bankAccount) {
      return NextResponse.json(
        { error: 'Account mappings not configured. Please configure your Xero accounts first.' },
        { status: 400 }
      );
    }

    // Get tenant GST settings
    const tenantData = await tenants.getTenantById(tenant.id);
    const isGstRegistered = tenantData?.gstRegistered ?? false;

    // Get orders from last 30 days that haven't been synced
    const recentOrders = await orders.getOrdersForSync(tenant.id, 30);

    if (recentOrders.length === 0) {
      return NextResponse.json({
        message: 'No orders to sync',
        synced: 0,
        failed: 0,
        total: 0,
        results: []
      });
    }

    const results: Array<{
      orderId: string;
      orderNumber: string;
      success: boolean;
      invoiceId?: string;
      error?: string;
    }> = [];
    let successCount = 0;
    let failCount = 0;

    for (const order of recentOrders) {
      // Calculate fees if not stored on the order
      const stripeFee = (order as any).fees?.stripe || 0;
      const platformFee = (order as any).fees?.platform || 0;

      const result = await syncOrderToXero(
        {
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          expiresAt: connection.tokenExpiresAt,
          xeroTenantId: connection.externalTenantId
        },
        {
          orderId: order.id,
          buyer: {
            name: order.customerName || 'Customer',
            email: order.customerEmail || ''
          },
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price
          })),
          shipping: order.shipping || 0,
          total: order.total,
          fees: {
            stripe: stripeFee,
            platform: platformFee
          },
          paidAt: (order as any).paidAt || order.createdAt
        },
        connection.accountMappings,
        isGstRegistered,
        async (tokens: { accessToken: string; refreshToken: string; expiresAt: Date }) => {
          // Update tokens if refreshed
          await accountingConnections.updateTokens(
            tenant.id,
            'xero',
            tokens.accessToken,
            tokens.refreshToken,
            tokens.expiresAt
          );
        }
      );

      if (result.success) {
        successCount++;
        // Mark order as synced
        await orders.markAsSynced(order.id, 'xero', result.invoiceId);
        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          success: true,
          invoiceId: result.invoiceId
        });
      } else {
        failCount++;
        // Mark sync as failed for retry tracking
        await orders.markSyncFailed(order.id, 'xero', result.error || 'Unknown error');
        results.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          success: false,
          error: result.error
        });

        // Stop processing if reauthorization is needed
        if (result.needsReauth) {
          await accountingConnections.markNeedsReauth(
            tenant.id,
            'xero',
            'Token expired during sync'
          );
          break;
        }
      }
    }

    // Update sync status
    await accountingConnections.updateSyncStatus(
      tenant.id,
      'xero',
      failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed'),
      failCount > 0 ? `${failCount} orders failed to sync` : undefined
    );

    return NextResponse.json({
      message: successCount > 0
        ? `Successfully synced ${successCount} order${successCount !== 1 ? 's' : ''} to Xero`
        : 'Sync completed with errors',
      synced: successCount,
      failed: failCount,
      total: recentOrders.length,
      results
    });
  } catch (error: any) {
    console.error('Xero sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/xero/sync
 * Get sync status and history
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await accountingConnections.getConnection(tenant.id, 'xero');
    if (!connection) {
      return NextResponse.json({ error: 'Xero not connected' }, { status: 400 });
    }

    // Get pending orders count
    const pendingOrders = await orders.getOrdersForSync(tenant.id, 30);
    const failedOrders = await orders.getFailedSyncOrders(tenant.id, 'xero');

    return NextResponse.json({
      lastSyncAt: connection.lastSyncAt,
      lastSyncStatus: connection.lastSyncStatus,
      lastSyncError: connection.lastSyncError,
      pendingOrdersCount: pendingOrders.length,
      failedOrdersCount: failedOrders.length,
      connectionStatus: connection.status
    });
  } catch (error: any) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
