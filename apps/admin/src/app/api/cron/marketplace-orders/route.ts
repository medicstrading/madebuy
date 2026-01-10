import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { marketplace, tenants, pieces } from '@madebuy/db'
import type { MarketplaceConnection, CreateMarketplaceOrderInput } from '@madebuy/shared'
import { getEbayApiUrl, getEbayDomain, EBAY_HEADERS, type EbayOrder } from '@/lib/marketplace/ebay'

/**
 * Timing-safe comparison for secrets to prevent timing attacks
 */
function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false
  try {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(`Bearer ${expected}`)
    if (receivedBuffer.length !== expectedBuffer.length) {
      timingSafeEqual(expectedBuffer, expectedBuffer)
      return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * GET /api/cron/marketplace-orders
 *
 * Imports new orders from connected marketplaces.
 * Should be scheduled to run every 15-30 minutes.
 *
 * Vercel cron config: schedule "0,15,30,45 * * * *"
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 minutes for processing

interface ImportResult {
  tenantId: string
  marketplace: string
  externalOrderId: string
  success: boolean
  error?: string
  orderId?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - ALWAYS require auth, even if env var is missing
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || !verifySecret(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting marketplace order import...')

    // Get all tenants with active marketplace features
    const allTenants = await tenants.getAllTenants()
    const results: ImportResult[] = []
    let importedCount = 0
    let errorCount = 0

    for (const tenant of allTenants) {
      // Check if tenant has marketplace feature
      if (!tenant.features?.marketplaceSync) {
        continue
      }

      // Get active eBay connection
      const ebayConnection = await marketplace.getConnectionByMarketplace(
        tenant.id,
        'ebay'
      )

      if (ebayConnection?.status === 'connected') {
        const ebayResults = await importEbayOrders(tenant.id, ebayConnection)
        results.push(...ebayResults)
        importedCount += ebayResults.filter((r) => r.success).length
        errorCount += ebayResults.filter((r) => !r.success).length
      }

      // Etsy order import would go here when available
    }

    console.log(
      `[CRON] Order import completed: ${importedCount} imported, ${errorCount} errors`
    )

    return NextResponse.json({
      success: true,
      imported: importedCount,
      errors: errorCount,
      results,
    })
  } catch (error) {
    console.error('[CRON] Order import error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to import orders',
        success: false,
      },
      { status: 500 }
    )
  }
}

/**
 * Import orders from eBay
 */
async function importEbayOrders(
  tenantId: string,
  connection: MarketplaceConnection
): Promise<ImportResult[]> {
  const results: ImportResult[] = []

  try {
    // Get orders from the last 7 days
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 7)

    // eBay Fulfillment API - Get Orders
    const params = new URLSearchParams({
      filter: `creationdate:[${fromDate.toISOString()}..${new Date().toISOString()}]`,
      limit: '50',
    })

    const response = await fetch(
      getEbayApiUrl(`/sell/fulfillment/v1/order?${params}`),
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'en-AU',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`[CRON] eBay order fetch failed for tenant ${tenantId}:`, errorData)
      return [
        {
          tenantId,
          marketplace: 'ebay',
          externalOrderId: 'N/A',
          success: false,
          error: `Failed to fetch orders: ${response.status}`,
        },
      ]
    }

    const data = await response.json()
    const orders = data.orders || []

    console.log(
      `[CRON] Found ${orders.length} eBay orders for tenant ${tenantId}`
    )

    for (const ebayOrder of orders) {
      const result = await importSingleEbayOrder(tenantId, ebayOrder)
      results.push(result)

      // Small delay to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  } catch (error) {
    console.error(`[CRON] Error importing eBay orders for tenant ${tenantId}:`, error)
    results.push({
      tenantId,
      marketplace: 'ebay',
      externalOrderId: 'N/A',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return results
}

/**
 * Import a single eBay order
 */
async function importSingleEbayOrder(
  tenantId: string,
  ebayOrder: EbayOrder
): Promise<ImportResult> {
  const externalOrderId = ebayOrder.orderId

  try {
    // Check if already imported
    const existing = await marketplace.isOrderImported(tenantId, 'ebay', externalOrderId)
    if (existing) {
      return {
        tenantId,
        marketplace: 'ebay',
        externalOrderId,
        success: true, // Not an error, just already imported
      }
    }

    // Map eBay order to MadeBuy format
    const orderInput = await mapEbayOrderToMadeBuy(tenantId, ebayOrder)

    // Track stock decrement failures
    const stockSyncErrors: Array<{ pieceId: string; error: string }> = []

    // Attempt to decrement stock for matched pieces before creating order
    for (const item of orderInput.items) {
      if (item.pieceId) {
        try {
          const success = await pieces.decrementStock(tenantId, item.pieceId, item.quantity)
          if (!success) {
            const errorMsg = `Insufficient stock or piece not found for quantity ${item.quantity}`
            console.error(
              `[CRON] Stock decrement failed for piece ${item.pieceId} (order ${externalOrderId}): ${errorMsg}`
            )
            stockSyncErrors.push({
              pieceId: item.pieceId,
              error: errorMsg,
            })
          }
        } catch (stockError) {
          const errorMsg = stockError instanceof Error ? stockError.message : 'Unknown error'
          console.error(
            `[CRON] Stock decrement error for piece ${item.pieceId} (order ${externalOrderId}):`,
            stockError
          )
          stockSyncErrors.push({
            pieceId: item.pieceId,
            error: errorMsg,
          })
        }
      }
    }

    // Add stock sync errors to order input if any occurred
    if (stockSyncErrors.length > 0) {
      orderInput.stockSyncErrors = stockSyncErrors
    }

    // Create the order (even if stock sync failed, we still want to import it)
    const order = await marketplace.createOrder(tenantId, orderInput)

    if (stockSyncErrors.length > 0) {
      console.warn(
        `[CRON] Imported eBay order ${externalOrderId} for tenant ${tenantId} with ${stockSyncErrors.length} stock sync error(s)`
      )
    } else {
      console.log(`[CRON] Imported eBay order ${externalOrderId} for tenant ${tenantId}`)
    }

    return {
      tenantId,
      marketplace: 'ebay',
      externalOrderId,
      success: true,
      orderId: order.id,
    }
  } catch (error) {
    console.error(`[CRON] Error importing eBay order ${externalOrderId}:`, error)
    return {
      tenantId,
      marketplace: 'ebay',
      externalOrderId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Map eBay order structure to MadeBuy marketplace order
 */
async function mapEbayOrderToMadeBuy(
  tenantId: string,
  ebayOrder: EbayOrder
): Promise<CreateMarketplaceOrderInput> {
  // Map order items and try to match with MadeBuy pieces
  const items = await Promise.all(
    (ebayOrder.lineItems || []).map(async (item: any) => {
      // Try to find the piece by SKU
      let pieceId: string | undefined
      if (item.sku) {
        const listing = await marketplace.getListingByExternalId(
          tenantId,
          'ebay',
          item.legacyItemId
        )
        if (listing) {
          pieceId = listing.pieceId
        }
      }

      const unitPrice = parseFloat(item.lineItemCost?.value || '0')
      const quantity = item.quantity || 1

      return {
        externalItemId: item.lineItemId,
        pieceId,
        title: item.title,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        sku: item.sku,
      }
    })
  )

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0)
  const shippingCost = parseFloat(
    ebayOrder.pricingSummary?.deliveryCost?.value || '0'
  )
  const tax = parseFloat(ebayOrder.pricingSummary?.tax?.value || '0')
  const total = parseFloat(ebayOrder.pricingSummary?.total?.value || '0')

  // Map order status
  let status: CreateMarketplaceOrderInput['status'] = 'pending'
  switch (ebayOrder.orderFulfillmentStatus) {
    case 'FULFILLED':
      status = 'shipped'
      break
    case 'IN_PROGRESS':
      status = 'paid' // Items are being prepared/fulfilled
      break
    case 'NOT_STARTED':
      status = 'pending'
      break
  }

  // Map payment status
  let paymentStatus: CreateMarketplaceOrderInput['paymentStatus'] = 'pending'
  switch (ebayOrder.orderPaymentStatus) {
    case 'PAID':
    case 'FULLY_REFUNDED':
    case 'PARTIALLY_REFUNDED':
      paymentStatus = 'paid'
      break
    case 'PENDING':
    case 'FAILED': // Treat failed as pending since we don't have a 'failed' status
      paymentStatus = 'pending'
      break
  }

  return {
    marketplace: 'ebay',
    externalOrderId: ebayOrder.orderId,
    externalUrl: `https://${getEbayDomain()}/sh/ord/details?orderid=${ebayOrder.orderId}`,
    status,
    paymentStatus,
    buyer: {
      name: ebayOrder.buyer?.username || 'Unknown',
      email: ebayOrder.buyer?.buyerRegistrationAddress?.email,
      username: ebayOrder.buyer?.username,
    },
    shippingAddress: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep
      ?.shipTo
      ? {
          name:
            ebayOrder.fulfillmentStartInstructions[0].shippingStep.shipTo
              .fullName || 'Unknown',
          street1:
            ebayOrder.fulfillmentStartInstructions[0].shippingStep.shipTo
              .contactAddress?.addressLine1 || '',
          street2:
            ebayOrder.fulfillmentStartInstructions[0].shippingStep.shipTo
              .contactAddress?.addressLine2,
          city: ebayOrder.fulfillmentStartInstructions[0].shippingStep.shipTo
            .contactAddress?.city || '',
          state:
            ebayOrder.fulfillmentStartInstructions[0].shippingStep.shipTo
              .contactAddress?.stateOrProvince,
          postalCode:
            ebayOrder.fulfillmentStartInstructions[0].shippingStep.shipTo
              .contactAddress?.postalCode || '',
          country:
            ebayOrder.fulfillmentStartInstructions[0].shippingStep.shipTo
              .contactAddress?.countryCode || 'AU',
        }
      : undefined,
    items,
    subtotal,
    shippingCost,
    tax,
    total,
    currency: ebayOrder.pricingSummary?.total?.currency || 'AUD',
    marketplaceFees: parseFloat(
      ebayOrder.totalFeeBasisAmount?.value || '0'
    ),
    orderDate: new Date(ebayOrder.creationDate),
    paidAt: ebayOrder.orderPaymentStatus === 'PAID' ? new Date() : undefined,
    rawData: ebayOrder as unknown as Record<string, unknown>,
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
