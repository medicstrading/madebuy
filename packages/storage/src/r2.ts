import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { MediaVariant } from '@madebuy/shared'
import { nanoid } from 'nanoid'

// File size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024 // 25MB

// Allowed MIME types for uploads
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf']
const ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
]

/**
 * Get the maximum file size for a given content type
 */
function getMaxFileSize(contentType: string): number {
  if (ALLOWED_IMAGE_TYPES.includes(contentType)) return MAX_IMAGE_SIZE
  if (ALLOWED_VIDEO_TYPES.includes(contentType)) return MAX_VIDEO_SIZE
  if (ALLOWED_DOCUMENT_TYPES.includes(contentType)) return MAX_DOCUMENT_SIZE
  return MAX_IMAGE_SIZE // default to image limit
}

/**
 * Format bytes to human-readable MB string
 */
function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)}MB`
}

// Lazy initialization - env vars are read at first use, not module load time
// This fixes issues where the storage package loads before Next.js injects .env.local
let _r2Client: S3Client | null = null
let _r2Config: {
  accountId: string
  bucketName: string
  publicUrl: string
} | null = null

function getR2Config() {
  if (!_r2Config) {
    const accountId = process.env.R2_ACCOUNT_ID || ''
    const bucketName = process.env.R2_BUCKET_NAME || 'madebuy'
    const publicUrl =
      process.env.R2_PUBLIC_URL || `https://pub-${accountId}.r2.dev`

    if (
      !accountId ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY
    ) {
      console.warn(
        '⚠️  R2 credentials not configured. Storage functions will fail.',
      )
    }

    _r2Config = { accountId, bucketName, publicUrl }
  }
  return _r2Config
}

function getR2Client(): S3Client {
  if (!_r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID || ''
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || ''
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ''

    _r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }
  return _r2Client
}

export interface UploadOptions {
  tenantId: string
  fileName: string
  buffer: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export async function uploadToR2(
  options: UploadOptions,
): Promise<MediaVariant> {
  const { tenantId, fileName, buffer, contentType, metadata } = options
  const config = getR2Config()

  // Validate file size
  const maxSize = getMaxFileSize(contentType)
  if (buffer.length > maxSize) {
    throw new Error(
      `File too large. Maximum size for ${contentType} is ${formatFileSize(maxSize)}. ` +
        `Your file is ${formatFileSize(buffer.length)}.`,
    )
  }

  // Validate content type
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(
      `Invalid file type: ${contentType}. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
    )
  }

  // Sanitize filename and use nanoid to prevent collisions
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${tenantId}/${nanoid()}-${sanitizedFileName}`

  // Sanitize metadata keys and values
  const sanitizedMetadata = metadata
    ? Object.fromEntries(
        Object.entries(metadata)
          .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
          .map(([k, v]) => [k.slice(0, 100), v.slice(0, 500)]),
      )
    : undefined

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: sanitizedMetadata,
  })

  await getR2Client().send(command)

  const url = `${config.publicUrl}/${key}`

  return {
    url,
    key,
    width: 0, // Will be set by image processor
    height: 0,
    size: buffer.length,
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const config = getR2Config()
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  await getR2Client().send(command)
}

export async function getFromR2(key: string): Promise<Buffer> {
  const config = getR2Config()
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  const response = await getR2Client().send(command)

  // S3 GetObjectCommand returns a Readable stream
  if (!response.Body) {
    throw new Error('No body in response')
  }

  const chunks: Buffer[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

export function getPublicUrl(key: string): string {
  const config = getR2Config()
  return `${config.publicUrl}/${key}`
}

/**
 * Generate a signed URL for private R2 objects
 * @param key - The R2 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @param contentType - Optional content type to force (if known)
 */
export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600,
  contentType?: string,
): Promise<string> {
  const config = getR2Config()

  // Determine if this is an image based on key extension or content type
  const isImage =
    contentType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(key)

  // For non-image files, force download and set explicit content type
  const commandParams: any = {
    Bucket: config.bucketName,
    Key: key,
  }

  if (!isImage) {
    // Force download for non-image files to prevent XSS via HTML uploads
    commandParams.ResponseContentDisposition = 'attachment'

    // Set explicit content type if known, otherwise force octet-stream
    if (contentType) {
      commandParams.ResponseContentType = contentType
    } else {
      // Force binary download for unknown types
      commandParams.ResponseContentType = 'application/octet-stream'
    }
  } else if (contentType) {
    // For images, set explicit content type if provided
    commandParams.ResponseContentType = contentType
  }

  const command = new GetObjectCommand(commandParams)

  return await awsGetSignedUrl(getR2Client(), command, { expiresIn })
}

/**
 * Store data in R2 with a deterministic key (for caching)
 * @param key - Exact key to use (no nanoid prefix)
 * @param buffer - Data to store
 * @param contentType - MIME type
 * @param metadata - Optional metadata
 */
export async function putToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const config = getR2Config()

  // Validate file size
  const maxSize = getMaxFileSize(contentType)
  if (buffer.length > maxSize) {
    throw new Error(
      `File too large. Maximum size for ${contentType} is ${formatFileSize(maxSize)}. ` +
        `Your file is ${formatFileSize(buffer.length)}.`,
    )
  }

  // Validate content type
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(
      `Invalid file type: ${contentType}. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
    )
  }

  // Sanitize metadata keys and values
  const sanitizedMetadata = metadata
    ? Object.fromEntries(
        Object.entries(metadata)
          .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
          .map(([k, v]) => [k.slice(0, 100), v.slice(0, 500)]),
      )
    : undefined

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: sanitizedMetadata,
  })

  await getR2Client().send(command)
}
