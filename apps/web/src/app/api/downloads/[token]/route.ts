import { downloads, pieces } from '@madebuy/db'
import type { DigitalFile } from '@madebuy/shared'
import { getSignedUrl } from '@madebuy/storage'
import { type NextRequest, NextResponse } from 'next/server'

// Rate limiting map (in production, use Redis)
const downloadAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS_PER_MINUTE = 10
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

// Signed URL expiry time (5 minutes)
const SIGNED_URL_EXPIRY = 5 * 60

/**
 * Check rate limit for an IP address
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = downloadAttempts.get(ip)

  if (!record || now > record.resetAt) {
    downloadAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (record.count >= MAX_ATTEMPTS_PER_MINUTE) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  record.count++
  return { allowed: true }
}

/**
 * GET /api/downloads/[token]
 * Validate download token and redirect to signed R2 URL
 *
 * Query params:
 * - file: File ID to download (required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const searchParams = request.nextUrl.searchParams
    const fileId = searchParams.get('file')

    // Get client info for logging
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Rate limit check
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many download attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
          },
        },
      )
    }

    // Validate token format
    if (!token || token.length < 20) {
      return NextResponse.json(
        { error: 'Invalid download token.' },
        { status: 400 },
      )
    }

    // File ID is required
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required.' },
        { status: 400 },
      )
    }

    // Get download record
    const record = await downloads.getDownloadRecordByToken(token)
    if (!record) {
      // Log failed attempt
      console.warn(
        `Download attempt with invalid token: ${token.substring(0, 8)}...`,
      )
      return NextResponse.json(
        { error: 'Download link not found or invalid.' },
        { status: 404 },
      )
    }

    // Get the piece to access its digital files
    const piece = await pieces.getPiece(record.tenantId, record.pieceId)
    if (!piece || !piece.digital?.files?.length) {
      await downloads.recordDownload(token, {
        fileId,
        ipAddress: ip,
        userAgent,
        success: false,
        error: 'Product not found or has no digital files',
      })
      return NextResponse.json(
        { error: 'Digital product not found.' },
        { status: 404 },
      )
    }

    const pieceFiles: DigitalFile[] = piece.digital.files

    // Validate the download
    const validation = await downloads.validateDownload(
      token,
      fileId,
      pieceFiles,
    )

    if (!validation.valid) {
      // Log the failed attempt
      await downloads.recordDownload(token, {
        fileId,
        ipAddress: ip,
        userAgent,
        success: false,
        error: validation.error,
      })

      // Return appropriate error response
      const statusCode =
        validation.error === 'expired' || validation.error === 'revoked'
          ? 403
          : validation.error === 'limit_reached'
            ? 429
            : 404

      return NextResponse.json(
        {
          error: validation.errorMessage,
          code: validation.error,
          downloadsRemaining: validation.downloadsRemaining,
        },
        { status: statusCode },
      )
    }

    // Generate signed URL for the file
    const file = validation.file!
    let signedUrl: string

    try {
      signedUrl = await getSignedUrl(file.r2Key, SIGNED_URL_EXPIRY)
    } catch (storageError) {
      console.error('Failed to generate signed URL:', storageError)
      await downloads.recordDownload(token, {
        fileId,
        ipAddress: ip,
        userAgent,
        success: false,
        error: 'Storage error',
      })
      return NextResponse.json(
        { error: 'Failed to generate download link. Please try again.' },
        { status: 500 },
      )
    }

    // Record successful download
    await downloads.recordDownload(token, {
      fileId,
      ipAddress: ip,
      userAgent,
      success: true,
    })

    // Return redirect to signed URL with download headers
    // Note: We use a 302 redirect so the browser downloads from R2 directly
    const response = NextResponse.redirect(signedUrl, 302)

    // Set cache headers to prevent caching of redirect
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')

    return response
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'An error occurred processing your download.' },
      { status: 500 },
    )
  }
}

/**
 * HEAD /api/downloads/[token]
 * Check download status without consuming a download
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const searchParams = request.nextUrl.searchParams
    const fileId = searchParams.get('file')

    if (!token || !fileId) {
      return new NextResponse(null, { status: 400 })
    }

    // Get download record
    const record = await downloads.getDownloadRecordByToken(token)
    if (!record) {
      return new NextResponse(null, { status: 404 })
    }

    // Get the piece
    const piece = await pieces.getPiece(record.tenantId, record.pieceId)
    if (!piece || !piece.digital?.files?.length) {
      return new NextResponse(null, { status: 404 })
    }

    const pieceFiles: DigitalFile[] = piece.digital.files
    const file = pieceFiles.find((f) => f.id === fileId)

    if (!file) {
      return new NextResponse(null, { status: 404 })
    }

    // Check validity without incrementing counter
    const isExpired =
      record.tokenExpiresAt && new Date() > new Date(record.tokenExpiresAt)
    const limitReached =
      record.maxDownloads && record.downloadCount >= record.maxDownloads

    if (record.isRevoked || isExpired || limitReached) {
      return new NextResponse(null, { status: 403 })
    }

    // Return file info in headers
    const headers = new Headers()
    headers.set('X-File-Name', file.fileName)
    headers.set('X-File-Size', String(file.sizeBytes))
    headers.set('X-Content-Type', file.mimeType)
    headers.set(
      'X-Downloads-Remaining',
      record.maxDownloads
        ? String(record.maxDownloads - record.downloadCount)
        : 'unlimited',
    )

    return new NextResponse(null, { status: 200, headers })
  } catch (error) {
    console.error('Download HEAD error:', error)
    return new NextResponse(null, { status: 500 })
  }
}
