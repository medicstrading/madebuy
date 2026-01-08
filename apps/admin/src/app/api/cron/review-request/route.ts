import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual, createHmac } from 'crypto'
import { orders, tenants, customers } from '@madebuy/db'
import { sendReviewRequestEmail } from '@/lib/email'

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
 * GET/POST /api/cron/review-request
 *
 * Review request email cron endpoint.
 * Sends review request emails to customers 7 days after order delivery.
 *
 * Respects email subscription preferences - will not send to unsubscribed customers.
 *
 * Should be scheduled to run daily.
 * Vercel cron config: schedule "0 10 * * *" (10am daily)
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for processing

interface EmailResult {
  orderId: string
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

    console.log('[CRON] Starting review request email check...')

    // Get all active tenants
    const allTenants = await tenants.listTenants()

    let totalProcessed = 0
    let totalSent = 0
    let totalSkipped = 0
    let totalFailed = 0
    const results: EmailResult[] = []

    // Unsubscribe secret for generating tokens
    const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET || 'default-unsubscribe-secret'

    // Process each tenant's orders
    for (const tenant of allTenants) {
      try {
        // Get orders ready for review request (delivered >= 7 days ago, not yet sent)
        const ordersForReview = await orders.getOrdersForReviewRequest(tenant.id, 7)

        if (ordersForReview.length === 0) {
          continue
        }

        console.log(`[CRON] Found ${ordersForReview.length} orders for review request for tenant ${tenant.id}`)

        for (const order of ordersForReview) {
          totalProcessed++

          try {
            // Check if customer has unsubscribed from emails
            const customer = await customers.getCustomerByEmail(tenant.id, order.customerEmail)

            // Skip if customer exists and has unsubscribed
            if (customer && customer.emailSubscribed === false) {
              console.log(`[CRON] Skipping order ${order.id} - customer ${order.customerEmail} has unsubscribed`)
              // Mark as sent to prevent future attempts
              await orders.markReviewRequestSent(tenant.id, order.id)
              totalSkipped++
              results.push({
                orderId: order.id,
                email: order.customerEmail,
                success: false,
                skipped: true,
                error: 'Customer unsubscribed',
              })
              continue
            }

            // Build review URL
            const baseUrl = tenant.customDomain
              ? `https://${tenant.customDomain}`
              : `https://madebuy.com.au/${tenant.slug}`
            const reviewUrl = `${baseUrl}/orders/${order.id}/review`

            // Build unsubscribe URL with token
            const unsubscribeToken = generateUnsubscribeToken(order.customerEmail, unsubscribeSecret)
            const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(order.customerEmail)}&token=${unsubscribeToken}`

            // Send the review request email
            const emailResult = await sendReviewRequestEmail({
              order,
              tenant,
              reviewUrl,
              unsubscribeUrl,
            })

            if (emailResult.success) {
              // Mark review request as sent
              await orders.markReviewRequestSent(tenant.id, order.id)
              totalSent++
              results.push({
                orderId: order.id,
                email: order.customerEmail,
                success: true,
              })
              console.log(`[CRON] Sent review request email for order ${order.id} to ${order.customerEmail}`)
            } else {
              totalFailed++
              results.push({
                orderId: order.id,
                email: order.customerEmail,
                success: false,
                error: emailResult.error,
              })
              console.error(`[CRON] Failed to send review request for order ${order.id}:`, emailResult.error)
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            totalFailed++
            results.push({
              orderId: order.id,
              email: order.customerEmail,
              success: false,
              error: errorMessage,
            })
            console.error(`[CRON] Error processing order ${order.id}:`, error)
          }
        }
      } catch (error) {
        console.error(`[CRON] Error processing tenant ${tenant.id}:`, error)
      }
    }

    console.log(`[CRON] Review request email completed: ${totalSent} sent, ${totalSkipped} skipped, ${totalFailed} failed out of ${totalProcessed} processed`)

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
      results: results.slice(0, 100), // Limit results in response
    })

  } catch (error) {
    console.error('[CRON] Review request email error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process review requests',
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
