/**
 * Stub repositories for archived functionality
 * These provide no-op implementations to keep checkout working
 */

// Stock Reservations - stubbed (was used for marketplace multi-vendor stock)
export async function reserveStock(
  _tenantId: string,
  _pieceId: string,
  _quantity: number,
  _sessionId: string,
  _expirationMinutes?: number,
  _variantId?: string
) {
  // Return truthy to indicate reservation succeeded
  return { id: 'stub', pieceId: _pieceId, quantity: _quantity }
}

export async function cancelReservation(_sessionId: string) {
  return true
}

export async function commitReservation(_sessionId: string) {
  return true
}

export async function completeReservation(_sessionId: string) {
  return true
}

// Transactions - stubbed (was used for marketplace payouts)
export async function createTransaction(_data: unknown) {
  return { id: 'stub' }
}

export async function getTransactionsByOrder(_orderId: string) {
  return []
}

export async function getTransactionByStripePaymentIntentId(_paymentIntentId: string) {
  return null
}

export async function updateTransactionStatus(_transactionId: string, _status: string) {
  return null
}
