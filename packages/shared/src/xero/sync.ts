import { createXeroClient, needsReauthorization } from './client';
import { createInvoiceFromOrder, AccountMappings } from './invoices';
import { recordOrderFees } from './expenses';
import { applyPaymentToInvoice } from './payments';

export interface OrderToSync {
  orderId: string;
  buyer: {
    name: string;
    email: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  shipping: number;
  total: number;
  fees: {
    stripe: number;
    platform: number;
  };
  paidAt: Date;
}

export interface SyncResult {
  success: boolean;
  invoiceId?: string;
  paymentId?: string;
  expenseIds?: { stripeExpenseId?: string; platformExpenseId?: string };
  error?: string;
  needsReauth?: boolean;
}

/**
 * Sync a completed order to Xero
 * Creates invoice, applies payment, and records fees as expenses
 */
export async function syncOrderToXero(
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    xeroTenantId: string;
  },
  order: OrderToSync,
  mappings: AccountMappings,
  isGstRegistered: boolean,
  onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string; expiresAt: Date }) => Promise<void>
): Promise<SyncResult> {
  try {
    const { client, tenantId } = await createXeroClient(tokens, onTokenRefresh);

    // 1. Create invoice for the order
    const invoiceId = await createInvoiceFromOrder(
      client,
      tenantId,
      {
        orderId: order.orderId,
        buyer: order.buyer,
        items: order.items,
        shipping: order.shipping,
        paidAt: order.paidAt
      },
      mappings,
      isGstRegistered
    );

    // 2. Apply payment to the invoice
    const paymentId = await applyPaymentToInvoice(
      client,
      tenantId,
      invoiceId,
      order.total,
      mappings.bankAccount,
      `MadeBuy Order #${order.orderId}`
    );

    // 3. Record fees as expenses
    const expenseIds = await recordOrderFees(
      client,
      tenantId,
      order.orderId,
      order.fees,
      mappings,
      isGstRegistered
    );

    return {
      success: true,
      invoiceId,
      paymentId,
      expenseIds
    };
  } catch (error: any) {
    console.error('Xero sync error:', error);

    return {
      success: false,
      error: error.message || 'Sync failed',
      needsReauth: needsReauthorization(error)
    };
  }
}

/**
 * Batch sync multiple orders to Xero
 * Stops early if reauthorization is needed
 */
export async function batchSyncOrdersToXero(
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    xeroTenantId: string;
  },
  orders: OrderToSync[],
  mappings: AccountMappings,
  isGstRegistered: boolean,
  onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string; expiresAt: Date }) => Promise<void>
): Promise<{
  results: Array<{ orderId: string } & SyncResult>;
  successCount: number;
  failCount: number;
  stoppedEarly: boolean;
}> {
  const results: Array<{ orderId: string } & SyncResult> = [];
  let successCount = 0;
  let failCount = 0;
  let stoppedEarly = false;

  for (const order of orders) {
    const result = await syncOrderToXero(
      tokens,
      order,
      mappings,
      isGstRegistered,
      onTokenRefresh
    );

    results.push({ orderId: order.orderId, ...result });

    if (result.success) {
      successCount++;
    } else {
      failCount++;

      // Stop processing if reauthorization is needed
      if (result.needsReauth) {
        stoppedEarly = true;
        break;
      }
    }
  }

  return {
    results,
    successCount,
    failCount,
    stoppedEarly
  };
}
