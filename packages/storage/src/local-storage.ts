import fs from 'node:fs/promises'
import path from 'node:path'
import type { MediaVariant } from '@madebuy/shared'

const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
const PUBLIC_URL_BASE = process.env.PUBLIC_URL_BASE || '/uploads'

export interface UploadOptions {
  tenantId: string
  fileName: string
  buffer: Buffer
  contentType: string
  metadata?: Record<string, string>
}

/**
 * Upload file to local filesystem storage
 * Files are stored in: public/uploads/{tenantId}/{timestamp}-{fileName}
 */
export async function uploadToLocal(
  options: UploadOptions,
): Promise<MediaVariant> {
  const { tenantId, fileName, buffer, contentType } = options

  // Create tenant directory if it doesn't exist
  const tenantDir = path.join(UPLOADS_DIR, tenantId)
  await fs.mkdir(tenantDir, { recursive: true })

  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const uniqueFileName = `${timestamp}-${sanitizedFileName}`
  const filePath = path.join(tenantDir, uniqueFileName)

  // Write file to disk
  await fs.writeFile(filePath, buffer)

  // Generate public URL path
  const key = `${tenantId}/${uniqueFileName}`
  const url = `${PUBLIC_URL_BASE}/${key}`

  return {
    url,
    key,
    width: 0, // Will be set by image processor
    height: 0,
    size: buffer.length,
  }
}

/**
 * Delete file from local filesystem storage
 */
export async function deleteFromLocal(key: string): Promise<void> {
  const filePath = path.join(UPLOADS_DIR, key)

  try {
    await fs.unlink(filePath)
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist, ignore
      return
    }
    throw error
  }
}

/**
 * Read file from local filesystem storage
 */
export async function getFromLocal(key: string): Promise<Buffer> {
  const filePath = path.join(UPLOADS_DIR, key)
  return await fs.readFile(filePath)
}

/**
 * Get public URL for a local file
 */
export function getLocalPublicUrl(key: string): string {
  return `${PUBLIC_URL_BASE}/${key}`
}

/**
 * Ensure uploads directory exists
 */
export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  console.log(`📁 Local uploads directory: ${UPLOADS_DIR}`)
}
