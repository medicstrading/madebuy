/**
 * Download - Digital product download tracking and access control
 */

/**
 * DownloadEvent - individual download attempt record
 */
export interface DownloadEvent {
  timestamp: Date
  ipAddress: string
  userAgent: string
  success: boolean
  error?: string
  fileId: string // Which file was downloaded
}

/**
 * DownloadRecord - tracks download access for a purchased digital product
 */
export interface DownloadRecord {
  id: string
  tenantId: string
  orderId: string
  orderItemId: string // Specific item in the order
  pieceId: string // The digital product

  // Access control
  downloadToken: string // Secure token for download URL (32 bytes, base64url)
  tokenExpiresAt?: Date // When the token expires (null = never)

  // Customer info (denormalized for quick access)
  customerEmail: string
  customerName: string

  // Limits
  downloadCount: number // Current total downloads across all files
  maxDownloads?: number // Maximum allowed downloads (null = unlimited)

  // Per-file download tracking
  fileDownloads: Record<string, number> // fileId -> download count

  // Tracking
  downloads: DownloadEvent[]

  // Status
  isRevoked: boolean // Manually disabled by seller
  revokedAt?: Date
  revokedReason?: string

  createdAt: Date
  updatedAt: Date
  lastDownloadAt?: Date
}

/**
 * CreateDownloadRecordInput - input for creating a download record
 */
export interface CreateDownloadRecordInput {
  orderId: string
  orderItemId: string
  pieceId: string
  customerEmail: string
  customerName: string
  maxDownloads?: number
  expiryDays?: number // Days until token expires
}

/**
 * DownloadValidationResult - result of validating a download attempt
 */
export interface DownloadValidationResult {
  valid: boolean
  error?:
    | 'expired'
    | 'limit_reached'
    | 'revoked'
    | 'not_found'
    | 'file_not_found'
  errorMessage?: string

  // If valid, includes the info needed to serve the file
  downloadRecord?: DownloadRecord
  file?: {
    id: string
    name: string
    fileName: string
    r2Key: string
    mimeType: string
    sizeBytes: number
  }

  // Download stats for display
  downloadsRemaining?: number | null // null = unlimited
}

/**
 * DownloadFilters - filters for listing download records
 */
export interface DownloadFilters {
  orderId?: string
  pieceId?: string
  customerEmail?: string
  isRevoked?: boolean
}

/**
 * DownloadStats - aggregate download statistics
 */
export interface DownloadStats {
  totalDownloads: number
  uniqueCustomers: number
  topFiles: Array<{
    fileId: string
    fileName: string
    downloads: number
  }>
  recentDownloads: DownloadEvent[]
}
