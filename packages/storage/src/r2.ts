import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import type { MediaVariant } from '@madebuy/shared'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'madebuy'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${R2_ACCOUNT_ID}.r2.dev`

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

  const key = `${tenantId}/${Date.now()}-${fileName}`

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
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
