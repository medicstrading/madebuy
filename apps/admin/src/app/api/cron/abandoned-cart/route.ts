import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual, createHmac } from 'crypto'
import { abandonedCarts, tenants, customers } from '@madebuy/db'
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
  success: boolean
  skipped?: boolean
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (timing-safe)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, require authorization
    if (cronSecret && !verifySecret(authHeader, cronSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting abandoned cart email check...')

    // Get all active tenants
    const allTenants = await tenants.listTenants()

    let totalProcessed = 0
    let totalSent = 0
    let totalSkipped = 0
    let totalFailed = 0
    const results: EmailResult[] = []

    // Unsubscribe secret for generating tokens
    const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET || 'default-unsubscribe-secret'

    // Process each tenant's abandoned carts
    for (const tenant of allTenants) {
      try {
        // Get carts that need recovery emails (abandoned > 1 hour, has email, not sent yet)
        const cartsToEmail = await abandonedCarts.getCartsForRecoveryEmail(tenant.id, 60)

        if (cartsToEmail.length === 0) {
          continue
        }

        console.log(`[CRON] Found ${cartsToEmail.length} carts to email for tenant ${tenant.id}`)

        for (const cart of cartsToEmail) {
          if (!cart.customerEmail) continue

          totalProcessed++

          try {
            // Check if customer has unsubscribed from emails
            const customer = await customers.getCustomerByEmail(tenant.id, cart.customerEmail)

            // Skip if customer exists and has unsubscribed
            if (customer && customer.emailSubscribed === false) {
              console.log(`[CRON] Skipping cart ${cart.id} - customer ${cart.customerEmail} has unsubscribed`)
              totalSkipped++
              results.push({
                cartId: cart.id,
                email: cart.customerEmail,
                success: false,
                skipped: true,
                error: 'Customer unsubscribed',
              })
              // Mark as sent to prevent future attempts
              await abandonedCarts.markRecoveryEmailSent(tenant.id, cart.id)
              continue
            }

            // Build recovery URL with cart ID for tracking
            const baseUrl = tenant.customDomain
              ? `https://${tenant.customDomain}`
              : `https://madebuy.com.au/${tenant.slug}`
            const recoveryUrl = `${baseUrl}/cart?recover=${cart.id}`

            // Build unsubscribe URL with token
            const unsubscribeToken = generateUnsubscribeToken(cart.customerEmail, unsubscribeSecret)
            const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(cart.customerEmail)}&token=${unsubscribeToken}`

            // Send the recovery email
            const emailResult = await sendAbandonedCartEmail({
              cart,
              tenant,
              recoveryUrl,
              unsubscribeUrl,
            })

            if (emailResult.success) {
              // Mark email as sent
              await abandonedCarts.markRecoveryEmailSent(tenant.id, cart.id)
              totalSent++
              results.push({
                cartId: cart.id,
                email: cart.customerEmail,
                success: true,
              })
              console.log(`[CRON] Sent recovery email for cart ${cart.id} to ${cart.customerEmail}`)
            } else {
              totalFailed++
              results.push({
                cartId: cart.id,
                email: cart.customerEmail,
                success: false,
                error: emailResult.error,
              })
              console.error(`[CRON] Failed to send email for cart ${cart.id}:`, emailResult.error)
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            totalFailed++
            results.push({
              cartId: cart.id,
              email: cart.customerEmail || 'unknown',
              success: false,
              error: errorMessage,
            })
            console.error(`[CRON] Error processing cart ${cart.id}:`, error)
          }
        }
      } catch (error) {
        console.error(`[CRON] Error processing tenant ${tenant.id}:`, error)
      }
    }

    console.log(`[CRON] Abandoned cart email completed: ${totalSent} sent, ${totalSkipped} skipped, ${totalFailed} failed out of ${totalProcessed} processed`)

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
      results: results.slice(0, 100), // Limit results in response
    })

  } catch (error) {
    console.error('[CRON] Abandoned cart email error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process abandoned carts',
        success: false
      },
      { status: 500 }
    )
  }
}

// Allow manual trigger via POST as well
export async function POST(request: NextRequest) {
  return GET(request)
}
