import { NextRequest, NextResponse } from 'next/server'
import { downloads, pieces, tenants } from '@madebuy/db'
import type { DigitalFile } from '@madebuy/shared'

/**
 * GET /api/downloads/[token]/info
 * Get download page information without consuming a download
 *
 * Returns product info, file list, download stats, and validity status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token format
    if (!token || token.length < 20) {
      return NextResponse.json(
        { error: 'Invalid download token.' },
        { status: 400 }
      )
    }

    // Get download record
    const record = await downloads.getDownloadRecordByToken(token)
    if (!record) {
      return NextResponse.json(
        { error: 'Download link not found or invalid.' },
        { status: 404 }
      )
    }

    // Get the piece
    const piece = await pieces.getPiece(record.tenantId, record.pieceId)
    if (!piece || !piece.digital?.files?.length) {
      return NextResponse.json(
        { error: 'Digital product not found.' },
        { status: 404 }
      )
    }

    // Get tenant info for branding
    const tenant = await tenants.getTenantById(record.tenantId)

    // Check validity status
    const isExpired = record.tokenExpiresAt && new Date() > new Date(record.tokenExpiresAt)
    const limitReached = record.maxDownloads && record.downloadCount >= record.maxDownloads

    let status: 'valid' | 'expired' | 'revoked' | 'limit_reached' = 'valid'
    let statusMessage: string | undefined

    if (record.isRevoked) {
      status = 'revoked'
      statusMessage = 'This download link has been disabled by the seller.'
    } else if (isExpired) {
      status = 'expired'
      statusMessage = 'This download link has expired.'
    } else if (limitReached) {
      status = 'limit_reached'
      statusMessage = `Download limit reached (${record.maxDownloads} downloads).`
    }

    // Prepare file list with per-file download counts
    const files = piece.digital.files.map((file: DigitalFile) => ({
      id: file.id,
      name: file.name,
      fileName: file.fileName,
      description: file.description,
      version: file.version,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      downloadCount: record.fileDownloads[file.id] || 0,
    }))

    // Calculate remaining downloads
    const downloadsRemaining = record.maxDownloads
      ? Math.max(0, record.maxDownloads - record.downloadCount)
      : null

    // Format expiry date if exists
    const expiresAt = record.tokenExpiresAt
      ? new Date(record.tokenExpiresAt).toISOString()
      : null

    // Prepare response
    const response = {
      // Status
      status,
      statusMessage,
      isValid: status === 'valid',

      // Product info
      product: {
        id: piece.id,
        name: piece.name,
        description: piece.description,
      },

      // Seller info
      seller: tenant ? {
        name: tenant.shopName || tenant.businessName,
        slug: tenant.slug,
      } : null,

      // Files
      files,
      fileCount: files.length,
      totalSizeBytes: files.reduce((sum: number, f: { sizeBytes: number }) => sum + f.sizeBytes, 0),

      // Download stats
      downloadCount: record.downloadCount,
      maxDownloads: record.maxDownloads,
      downloadsRemaining,

      // Expiry
      expiresAt,
      hasExpiry: !!expiresAt,

      // License
      license: piece.digital.licenseType ? {
        type: piece.digital.licenseType,
        text: piece.digital.licenseText,
      } : null,

      // Customer info (limited)
      customer: {
        name: record.customerName,
        email: record.customerEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Partially hide email
      },

      // Order reference
      orderId: record.orderId,

      // Timestamps
      createdAt: record.createdAt,
      lastDownloadAt: record.lastDownloadAt,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Download info error:', error)
    return NextResponse.json(
      { error: 'An error occurred fetching download information.' },
      { status: 500 }
    )
  }
}
