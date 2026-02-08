import { createHmac, timingSafeEqual } from 'node:crypto'
import { abandonedCarts, customers, tenants } from '@madebuy/db'
import { type NextRequest, NextResponse } from 'next/server'
import { sendAbandonedCartEmail } from '@/lib/email'

/**
 * Timing-safe comparison for secrets to prevent timing attacks
 */
function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false
  try {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(`Bearer ${expected}`)
    if (receivedBuffer.length !== expectedBuffer.length) {
      // Compare against expected anyway to prevent timing leaks
      timingSafeEqual(expectedBuffer, expectedBuffer)
      return false
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

/**
 * Generate unsubscribe token for an email
 */
function generateUnsubscribeToken(email: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32)
}

/**
 * GET/POST /api/cron/abandoned-cart
 *
 * Abandoned cart recovery email cron endpoint.
 * Sends recovery emails to customers who have abandoned their carts.
 *
 * Email schedule (timezone-aware via UTC timestamps):
 * - First email: 1 hour after cart abandonment
 * - Second email: 24 hours after cart abandonment
 *
 * Respects email subscription preferences - will not send to unsubscribed customers.
 *
 * Should be scheduled to run hourly.
 * Vercel cron config: schedule "0 * * * *" (every hour)
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

interface EmailResult {
  cartId: string
  email: string
  emailType: 'first' | 'second'
  success: boolean
  skipped?: boolean
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (fail-closed)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // CRON_SECRET must be configured - fail closed if missing
    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify the provided secret matches (timing-safe)
    if (!verifySecret(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting abandoned cart email check...')

    // Unsubscribe secret for generating tokens - must match web handler
    const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET
    if (!unsubscribeSecret) {
      console.error('[CRON] UNSUBSCRIBE_SECRET environment variable is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Process tenants in batches to avoid OOM
    const BATCH_SIZE = 50
    const MAX_TOTAL_TENANTS = 500 // Safety limit per cron invocation
    let totalProcessed = 0
    let totalSent = 0
    let totalSkipped = 0
    let totalFailed = 0
    let totalTenants = 0
    const results: EmailResult[] = []
    let lastId: string | undefined = undefined

    while (totalTenants < MAX_TOTAL_TENANTS) {
      // Get next batch of tenants
      const tenantBatch = await tenants.listTenants(BATCH_SIZE, lastId)

      if (tenantBatch.length === 0) {
        break
      }

      // Process each tenant's abandoned carts
      for (const tenant of tenantBatch) {
        totalTenants++

        try {
          // ===== FIRST EMAIL: After 1 hour =====
          const cartsForFirstEmail =
            await abandonedCarts.getCartsForRecoveryEmail(tenant.id, 60) // 1 hour

          if (cartsForFirstEmail.length > 0) {
            console.log(
              `[CRON] Found ${cartsForFirstEmail.length} carts for first email for tenant ${tenant.id}`,
            )

            for (const cart of cartsForFirstEmail) {
              const emailResult = await processCartEmail(
                cart,
                tenant,
                'first',
                unsubscribeSecret,
                async () =>
                  abandonedCarts.markRecoveryEmailSent(tenant.id, cart.id),
              )
              results.push(emailResult)
              totalProcessed++
              if (emailResult.success) totalSent++
              else if (emailResult.skipped) totalSkipped++
              else totalFailed++
            }
          }

          // ===== SECOND EMAIL: After 24 hours =====
          const cartsForSecondEmail =
            await abandonedCarts.getCartsForSecondRecoveryEmail(
              tenant.id,
              24 * 60,
            ) // 24 hours

          if (cartsForSecondEmail.length > 0) {
            console.log(
              `[CRON] Found ${cartsForSecondEmail.length} carts for second email for tenant ${tenant.id}`,
            )

            for (const cart of cartsForSecondEmail) {
              const emailResult = await processCartEmail(
                cart,
                tenant,
                'second',
                unsubscribeSecret,
                async () =>
                  abandonedCarts.markSecondEmailSent(tenant.id, cart.id),
              )
              results.push(emailResult)
              totalProcessed++
              if (emailResult.success) totalSent++
              else if (emailResult.skipped) totalSkipped++
              else totalFailed++
            }
          }
        } catch (error) {
          console.error(`[CRON] Error processing tenant ${tenant.id}:`, error)
        }
      }

      // Set cursor for next batch
      lastId = tenantBatch[tenantBatch.length - 1]?.id

      // If we got fewer results than batch size, we're done
      if (tenantBatch.length < BATCH_SIZE) {
        break
      }
    }

    console.log(
      `[CRON] Abandoned cart email completed: ${totalSent} sent, ${totalSkipped} skipped, ${totalFailed} failed out of ${totalProcessed} processed (checked ${totalTenants} tenants)`,
    )

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
      tenantsChecked: totalTenants,
      results: results.slice(0, 100), // Limit results in response
    })
  } catch (error) {
    console.error('[CRON] Abandoned cart email error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process abandoned carts',
        success: false,
      },
      { status: 500 },
    )
  }
}

/**
 * Process a single cart email (first or second)
 */
async function processCartEmail(
  cart: Awaited<ReturnType<typeof abandonedCarts.getCartsForRecoveryEmail>>[0],
  tenant: Awaited<ReturnType<typeof tenants.listTenants>>[0],
  emailType: 'first' | 'second',
  unsubscribeSecret: string,
  markSentCallback: () => Promise<void>,
): Promise<EmailResult> {
  if (!cart.customerEmail) {
    return {
      cartId: cart.id,
      email: 'unknown',
      emailType,
      success: false,
      error: 'No email address',
    }
  }

  try {
    // Check if customer exists and their email preferences
    const customer = await customers.getCustomerByEmail(
      tenant.id,
      cart.customerEmail,
    )

    // Skip if customer has explicitly unsubscribed
    if (customer && customer.emailSubscribed === false) {
      console.log(
        `[CRON] Skipping cart ${cart.id} (${emailType}) - customer ${cart.customerEmail} has unsubscribed`,
      )
      // Mark as sent to prevent future attempts
      await markSentCallback()
      return {
        cartId: cart.id,
        email: cart.customerEmail,
        emailType,
        success: false,
        skipped: true,
        error: 'Customer unsubscribed',
      }
    }

    // Skip if customer is a first-time visitor with no prior purchases and hasn't opted in
    // Only send to: customers with prior orders OR customers who have explicitly opted in
    if (customer) {
      // Check if customer has any prior orders
      const hasOrders = customer.orderCount && customer.orderCount > 0
      const hasOptedIn = customer.emailSubscribed === true || customer.marketingOptIn === true

      if (!hasOrders && !hasOptedIn) {
        console.log(
          `[CRON] Skipping cart ${cart.id} (${emailType}) - first-time visitor without opt-in`,
        )
        // Mark as sent to prevent future attempts
        await markSentCallback()
        return {
          cartId: cart.id,
          email: cart.customerEmail,
          emailType,
          success: false,
          skipped: true,
          error: 'No prior relationship or opt-in',
        }
      }
    } else {
      // No customer record exists - skip for compliance
      console.log(
        `[CRON] Skipping cart ${cart.id} (${emailType}) - no customer record found`,
      )
      // Mark as sent to prevent future attempts
      await markSentCallback()
      return {
        cartId: cart.id,
        email: cart.customerEmail,
        emailType,
        success: false,
        skipped: true,
        error: 'No customer record',
      }
    }

    // Build recovery URL with cart ID for tracking
    const baseUrl = tenant.customDomain
      ? `https://${tenant.customDomain}`
      : `https://madebuy.com.au/${tenant.slug}`
    const recoveryUrl = `${baseUrl}/cart?recover=${cart.id}`

    // Build unsubscribe URL with token
    const unsubscribeToken = generateUnsubscribeToken(
      cart.customerEmail,
      unsubscribeSecret,
    )
    const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(cart.customerEmail)}&token=${unsubscribeToken}`

    // Send the recovery email (same template for both, but could be customized)
    // Build cart data with required customerEmail (we've already validated it exists above)
    const cartData = {
      id: cart.id,
      customerEmail: cart.customerEmail, // Already validated as non-null
      items: cart.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      })),
      total: cart.total,
      currency: cart.currency || 'AUD',
    }
    const emailResult = await sendAbandonedCartEmail({
      cart: cartData,
      tenant,
      recoveryUrl,
      unsubscribeUrl,
    })

    if (emailResult.success) {
      // Mark email as sent
      await markSentCallback()
      console.log(
        `[CRON] Sent ${emailType} recovery email for cart ${cart.id} to ${cart.customerEmail}`,
      )
      return {
        cartId: cart.id,
        email: cart.customerEmail,
        emailType,
        success: true,
      }
    } else {
      console.error(
        `[CRON] Failed to send ${emailType} email for cart ${cart.id}:`,
        emailResult.error,
      )
      return {
        cartId: cart.id,
        email: cart.customerEmail,
        emailType,
        success: false,
        error: emailResult.error,
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error(
      `[CRON] Error processing cart ${cart.id} (${emailType}):`,
      error,
    )
    return {
      cartId: cart.id,
      email: cart.customerEmail || 'unknown',
      emailType,
      success: false,
      error: errorMessage,
    }
  }
}

// Allow manual trigger via POST as well
export async function POST(request: NextRequest) {
  return GET(request)
}
