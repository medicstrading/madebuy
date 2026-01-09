import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { downloads, pieces } from '@madebuy/db'
import { getTenantById } from '@/lib/tenant'
import { DownloadPageClient } from './DownloadPageClient'

interface DownloadPageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: DownloadPageProps): Promise<Metadata> {
  const { token } = await params

  // Get download record
  const record = await downloads.getDownloadRecordByToken(token)
  if (!record) {
    return { title: 'Download Not Found' }
  }

  // Get piece for title
  const piece = await pieces.getPiece(record.tenantId, record.pieceId)
  const tenant = await getTenantById(record.tenantId)

  return {
    title: piece ? `Download: ${piece.name}` : 'Your Download',
    description: `Download your digital purchase${tenant ? ` from ${tenant.businessName}` : ''}`,
    robots: { index: false, follow: false }, // Don't index download pages
  }
}

export default async function DownloadPage({ params }: DownloadPageProps) {
  const { token } = await params

  // Validate token format
  if (!token || token.length < 20) {
    notFound()
  }

  // Get download record
  const record = await downloads.getDownloadRecordByToken(token)
  if (!record) {
    notFound()
  }

  // Get the piece
  const piece = await pieces.getPiece(record.tenantId, record.pieceId)
  if (!piece || !piece.digital?.files?.length) {
    notFound()
  }

  // Get tenant info
  const tenant = await getTenantById(record.tenantId)

  // Check status
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

  // Prepare file list
  const files = piece.digital.files.map((file) => ({
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

  // Prepare data for client component
  const downloadData = {
    status,
    statusMessage,
    isValid: status === 'valid',

    product: {
      id: piece.id,
      name: piece.name,
      description: piece.description,
    },

    seller: tenant ? {
      name: tenant.businessName || 'Seller',
      slug: tenant.slug,
    } : null,

    files,
    fileCount: files.length,
    totalSizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),

    downloadCount: record.downloadCount,
    maxDownloads: record.maxDownloads,
    downloadsRemaining,

    expiresAt: record.tokenExpiresAt ? new Date(record.tokenExpiresAt).toISOString() : null,
    hasExpiry: !!record.tokenExpiresAt,

    license: piece.digital.licenseType ? {
      type: piece.digital.licenseType,
      text: piece.digital.licenseText,
    } : null,

    customer: {
      name: record.customerName,
    },

    orderId: record.orderId,
    token,
  }

  return <DownloadPageClient data={downloadData} />
}
