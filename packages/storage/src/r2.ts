import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
import { nanoid } from 'nanoid'
import type { MediaVariant } from '@madebuy/shared'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'madebuy'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${R2_ACCOUNT_ID}.r2.dev`

// Allowed MIME types for uploads
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
const ALLOWED_DOCUMENT_TYPES = ['application/pdf']
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES]

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn('⚠️  R2 credentials not configured. Storage functions will fail.')
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export interface UploadOptions {
  tenantId: string
  fileName: string
  buffer: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export async function uploadToR2(options: UploadOptions): Promise<MediaVariant> {
  const { tenantId, fileName, buffer, contentType, metadata } = options

  // Validate content type
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`Invalid file type: ${contentType}. Allowed types: ${ALLOWED_TYPES.join(', ')}`)
  }

  // Sanitize filename and use nanoid to prevent collisions
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const key = `${tenantId}/${nanoid()}-${sanitizedFileName}`

  // Sanitize metadata keys and values
  const sanitizedMetadata = metadata
    ? Object.fromEntries(
        Object.entries(metadata)
          .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
          .map(([k, v]) => [k.slice(0, 100), v.slice(0, 500)])
      )
    : undefined

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: sanitizedMetadata,
  })

  await r2Client.send(command)

  const url = `${R2_PUBLIC_URL}/${key}`

  return {
    url,
    key,
    width: 0, // Will be set by image processor
    height: 0,
    size: buffer.length,
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  await r2Client.send(command)
}

export async function getFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  const response = await r2Client.send(command)
  const stream = response.Body as any

  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`
}

/**
 * Generate a signed URL for private R2 objects
 * @param key - The R2 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  return await awsGetSignedUrl(r2Client, command, { expiresIn })
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
  metadata?: Record<string, string>
): Promise<void> {
  // Validate content type
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`Invalid file type: ${contentType}. Allowed types: ${ALLOWED_TYPES.join(', ')}`)
  }

  // Sanitize metadata keys and values
  const sanitizedMetadata = metadata
    ? Object.fromEntries(
        Object.entries(metadata)
          .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
          .map(([k, v]) => [k.slice(0, 100), v.slice(0, 500)])
      )
    : undefined

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: sanitizedMetadata,
  })

  await r2Client.send(command)
}
