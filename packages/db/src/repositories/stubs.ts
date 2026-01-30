/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Stub repositories for archived marketplace functionality
 * These provide no-op implementations for backwards compatibility
 *
 * Note: Stock reservations have been moved to stockReservations.ts with real implementation
 */

// Transactions - stubbed (was used for marketplace payouts)
export async function createTransaction(_data: unknown) {
  return { id: 'stub' }
}

export async function getTransactionsByOrder(_orderId: string) {
  return []
}

export async function getTransactionByStripePaymentIntentId(
  _paymentIntentId: string,
) {
  return null
}

export async function updateTransactionStatus(
  _transactionId: string,
  _status: string,
) {
  return null
}
