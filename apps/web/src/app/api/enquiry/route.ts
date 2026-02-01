import { enquiries, tenants, tracking } from '@madebuy/db'
import type { CreateEnquiryInput } from '@madebuy/shared'
import {
  ExternalServiceError,
  isMadeBuyError,
  NotFoundError,
  safeValidateCreateEnquiry,
  sanitizeInput,
  toErrorResponse,
  ValidationError,
} from '@madebuy/shared'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const ATTRIBUTION_COOKIE = 'mb_attribution'
const SESSION_COOKIE = 'mb_session'

/**
 * POST /api/enquiry
 * Submit a customer enquiry with traffic attribution
 */
export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per 15 minutes per IP (prevent spam)
  const rateLimitResponse = await checkRateLimit(request, {
    limit: 5,
    windowMs: 900000, // 15 minutes
    keyPrefix: 'enquiry',
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // Validate with Zod
    const validation = safeValidateCreateEnquiry(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const {
      name,
      email,
      message,
      pieceId,
      pieceName,
      source,
      sourceDomain,
      turnstileToken,
    } = validation.data

    // Get tenantId from body (not in schema since it's context)
    const tenantId = body.tenantId
    if (!tenantId || typeof tenantId !== 'string') {
      throw new ValidationError('tenantId is required')
    }

    // Verify Turnstile token (skip in development if no key configured)
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.TURNSTILE_SECRET_KEY
    ) {
      if (!turnstileToken) {
        throw new ValidationError('CAPTCHA verification required')
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
        throw new ExternalServiceError(
          'Cloudflare Turnstile',
          'CAPTCHA verification failed',
        )
      }
    }

    // Validate tenant exists before creating enquiry
    const tenant =
      (await tenants.getTenantById(tenantId)) ||
      (await tenants.getTenantBySlug(tenantId))
    if (!tenant) {
      throw new NotFoundError('Tenant', tenantId)
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

    // Create the enquiry with attribution (sanitize user text inputs)
    const enquiryInput: CreateEnquiryInput = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      message: sanitizeInput(message),
      pieceId,
      pieceName: pieceName ? sanitizeInput(pieceName) : undefined,
      source: (source as 'shop' | 'custom_domain') || 'shop', // Type-checked, no sanitization needed
      sourceDomain: sourceDomain ? sanitizeInput(sourceDomain) : undefined,
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
    if (isMadeBuyError(error)) {
      const { error: msg, code, statusCode, details } = toErrorResponse(error)
      return NextResponse.json(
        { error: msg, code, details },
        { status: statusCode },
      )
    }

    // Log and return generic error for unexpected errors
    console.error('Unexpected enquiry submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
