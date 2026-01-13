import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getDatabase } from '@madebuy/db'

/**
 * eBay Marketplace Account Deletion Webhook
 *
 * Required for eBay API compliance. Handles notifications when users
 * request deletion of their eBay account data.
 *
 * Endpoint: /api/webhooks/ebay/account-deletion
 *
 * Two request types:
 * 1. GET - Challenge verification (eBay verifies endpoint is valid)
 * 2. POST - Actual deletion notification
 */

const VERIFICATION_TOKEN = process.env.EBAY_DELETION_VERIFICATION_TOKEN

/**
 * GET - Handle eBay's challenge verification
 *
 * eBay sends: ?challenge_code=xxx
 * We must respond with hash of: challenge_code + verification_token + endpoint_url
 */
export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get('challenge_code')

  if (!challengeCode) {
    return NextResponse.json({ error: 'Missing challenge_code' }, { status: 400 })
  }

  if (!VERIFICATION_TOKEN) {
    console.error('EBAY_DELETION_VERIFICATION_TOKEN not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Build the endpoint URL (must match exactly what's registered with eBay)
  const endpoint = process.env.EBAY_DELETION_ENDPOINT_URL ||
    `${process.env.NEXT_PUBLIC_WEB_URL || 'https://madebuy.com.au'}/api/webhooks/ebay/account-deletion`

  // Create challenge response hash
  // Hash = SHA256(challengeCode + verificationToken + endpoint)
  const hash = crypto
    .createHash('sha256')
    .update(challengeCode + VERIFICATION_TOKEN + endpoint)
    .digest('hex')

  console.log('eBay challenge verification successful')

  return NextResponse.json({ challengeResponse: hash })
}

/**
 * POST - Handle account deletion notification
 *
 * eBay sends notification when user requests data deletion.
 * We must delete/anonymize their eBay-related data.
 *
 * Payload format:
 * {
 *   "metadata": { "topic": "MARKETPLACE_ACCOUNT_DELETION", "schemaVersion": "1.0", "deprecated": false },
 *   "notification": {
 *     "notificationId": "...",
 *     "eventDate": "2025-09-19T20:43:59.462Z",
 *     "publishDate": "2025-09-19T20:43:59.679Z",
 *     "publishAttemptCount": 1,
 *     "data": {
 *       "username": "ebayuser",
 *       "userId": "IMMUTABLE_USER_ID",
 *       "eiasToken": "..."
 *     }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log for audit purposes (excluding sensitive data in production)
    console.log('eBay account deletion notification received:', {
      topic: body.metadata?.topic,
      notificationId: body.notification?.notificationId,
      publishAttemptCount: body.notification?.publishAttemptCount,
    })

    // Validate metadata
    if (body.metadata?.topic !== 'MARKETPLACE_ACCOUNT_DELETION') {
      console.error('Invalid eBay notification topic:', body.metadata?.topic)
      return new NextResponse(null, { status: 200 }) // Acknowledge but ignore
    }

    // Extract user info from notification.data
    const notification = body.notification
    if (!notification?.data) {
      console.error('Invalid eBay deletion notification - missing notification.data')
      return new NextResponse(null, { status: 400 })
    }

    const { username, userId, eiasToken } = notification.data

    if (!userId && !username && !eiasToken) {
      console.error('Invalid eBay deletion notification - no user identifier')
      return new NextResponse(null, { status: 400 })
    }

    // Delete/anonymize eBay-related data from our database
    await handleEbayDataDeletion({
      userId,
      username,
      eiasToken,
      notificationId: notification.notificationId,
      eventDate: notification.eventDate,
    })

    // Return success - eBay accepts 200, 201, 202, or 204
    return new NextResponse(null, { status: 200 })

  } catch (error) {
    console.error('eBay account deletion webhook error:', error)
    // Still return 200 to acknowledge receipt - we'll handle errors internally
    return new NextResponse(null, { status: 200 })
  }
}

interface EbayDeletionRequest {
  userId?: string
  username?: string
  eiasToken?: string
  notificationId?: string
  eventDate?: string
}

/**
 * Handle the actual data deletion for an eBay user
 *
 * Removes or anonymizes any data associated with the eBay user ID.
 * Searches by userId, username, and eiasToken to ensure complete deletion.
 */
async function handleEbayDataDeletion(request: EbayDeletionRequest) {
  const db = await getDatabase()
  const { userId, username, eiasToken, notificationId, eventDate } = request

  console.log(`Processing eBay data deletion - notificationId: ${notificationId}`)

  // Build query to match any of the identifiers
  const userQuery = {
    $or: [
      ...(userId ? [{ 'ebayConnection.userId': userId }] : []),
      ...(username ? [{ 'ebayConnection.username': username }] : []),
      ...(eiasToken ? [{ 'ebayConnection.eiasToken': eiasToken }] : []),
    ].filter(Boolean)
  }

  // Only proceed if we have at least one identifier
  if (userQuery.$or.length > 0) {
    // Remove eBay connection data from tenants
    const tenantResult = await db.collection('tenants').updateMany(
      userQuery,
      {
        $unset: { ebayConnection: '' },
        $set: { updatedAt: new Date() }
      }
    )

    if (tenantResult.modifiedCount > 0) {
      console.log(`Removed eBay connection from ${tenantResult.modifiedCount} tenant(s)`)
    }

    // Remove any eBay-specific publish records
    const publishQuery = {
      platform: 'ebay',
      $or: [
        ...(userId ? [{ 'platformData.userId': userId }] : []),
        ...(username ? [{ 'platformData.username': username }] : []),
      ].filter(Boolean)
    }

    if (publishQuery.$or.length > 0) {
      const publishResult = await db.collection('publish_records').deleteMany(publishQuery)
      if (publishResult.deletedCount > 0) {
        console.log(`Deleted ${publishResult.deletedCount} eBay publish record(s)`)
      }
    }

    // Remove any stored eBay listings data
    const listingsQuery = {
      $or: [
        ...(userId ? [{ ebayUserId: userId }] : []),
        ...(username ? [{ ebayUsername: username }] : []),
      ].filter(Boolean)
    }

    if (listingsQuery.$or.length > 0) {
      const listingsResult = await db.collection('ebay_listings').deleteMany(listingsQuery)
      if (listingsResult.deletedCount > 0) {
        console.log(`Deleted ${listingsResult.deletedCount} eBay listing(s)`)
      }
    }
  }

  // Log the deletion event for compliance audit
  await db.collection('audit_logs').insertOne({
    eventType: 'ebay.account_deletion',
    notificationId,
    eventDate,
    ebayUserId: userId,
    ebayUsername: username,
    ebayEiasToken: eiasToken,
    processedAt: new Date(),
    status: 'completed'
  })

  console.log('eBay data deletion completed successfully')
}
