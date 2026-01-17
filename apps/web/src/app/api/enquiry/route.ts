import { enquiries, tenants, tracking } from '@madebuy/db'
import type { CreateEnquiryInput } from '@madebuy/shared'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const ATTRIBUTION_COOKIE = 'mb_attribution'
const SESSION_COOKIE = 'mb_session'

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * POST /api/enquiry
 * Submit a customer enquiry with traffic attribution
 */
export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per 15 minutes per IP (prevent spam)
  const rateLimitResponse = checkRateLimit(request, {
    limit: 5,
    windowMs: 900000, // 15 minutes
    keyPrefix: 'enquiry',
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const {
      tenantId,
      name,
      email,
      message,
      pieceId,
      pieceName,
      source,
      sourceDomain,
      turnstileToken,
    } = body

    // Validate input types to prevent NoSQL injection
    if (
      typeof tenantId !== 'string' ||
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof message !== 'string' ||
      (pieceId !== undefined && typeof pieceId !== 'string') ||
      (pieceName !== undefined && typeof pieceName !== 'string') ||
      (source !== undefined && typeof source !== 'string') ||
      (sourceDomain !== undefined && typeof sourceDomain !== 'string')
    ) {
      return NextResponse.json({ error: 'Invalid input type' }, { status: 400 })
    }

    // Verify Turnstile token (skip in development if no key configured)
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.TURNSTILE_SECRET_KEY
    ) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'CAPTCHA verification required' },
          { status: 400 },
        )
      }

      const turnstileVerify = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY || '',
            response: turnstileToken,
          }),
        },
      )

      const turnstileResult = await turnstileVerify.json()
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed' },
          { status: 400 },
        )
      }
    }

    // Validate required fields
    if (!tenantId || !name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, name, email, message' },
        { status: 400 },
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      )
    }

    // Validate tenant exists before creating enquiry
    const tenant =
      (await tenants.getTenantById(tenantId)) ||
      (await tenants.getTenantBySlug(tenantId))
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
    }

    // Get attribution from cookies
    const cookieStore = await cookies()
    const attributionCookie = cookieStore.get(ATTRIBUTION_COOKIE)?.value
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value

    let trafficSource = 'direct'
    let trafficMedium: string | undefined
    let trafficCampaign: string | undefined
    let landingPage: string | undefined

    if (attributionCookie) {
      try {
        const attribution = JSON.parse(attributionCookie)
        trafficSource = attribution.source || 'direct'
        trafficMedium = attribution.medium
        trafficCampaign = attribution.campaign
        landingPage = attribution.landingPage
      } catch {
        // Ignore parse errors
      }
    }

    // Create the enquiry with attribution
    const enquiryInput: CreateEnquiryInput = {
      name,
      email,
      message,
      pieceId,
      pieceName,
      source: source || 'shop',
      sourceDomain,
      trafficSource,
      trafficMedium,
      trafficCampaign,
      landingPage,
      sessionId,
    }

    // Use tenant.id for consistency across all operations
    const enquiry = await enquiries.createEnquiry(tenant.id, enquiryInput)

    // Log enquiry event for analytics
    tracking.logEvent(
      tenant.id,
      'enquiry_submit',
      trafficSource,
      request.nextUrl.pathname,
      sessionId || 'unknown',
      pieceId,
    )

    return NextResponse.json({ enquiry }, { status: 201 })
  } catch (error) {
    console.error('Enquiry submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit enquiry' },
      { status: 500 },
    )
  }
}
