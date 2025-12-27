import sharp from 'sharp'
import phash from 'sharp-phash'
import { uploadToR2 } from './r2'
import type { MediaVariant } from '@madebuy/shared'

export interface ProtectedUploadOptions {
  tenantId: string
  fileName: string
  buffer: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export interface ProtectedUploadResult {
  original: MediaVariant & { hash: string }
  watermarked: MediaVariant
  thumbnail: MediaVariant
}

/**
 * Upload product image with IP protection:
 * 1. Calculate perceptual hash (pHash) for ownership proof
 * 2. Create watermarked variant for public display
 * 3. Create thumbnail for listings
 * 4. Store original with access control
 */
export async function uploadProtectedImage(
  options: ProtectedUploadOptions
): Promise<ProtectedUploadResult> {
  const { tenantId, fileName, buffer, contentType, metadata } = options

  // 1. Calculate pHash for IP protection
  const imageHash = await phash(buffer)

  // 2. Process image to get dimensions
  const image = sharp(buffer)
  const sharpMetadata = await image.metadata()
  const width = sharpMetadata.width || 0
  const height = sharpMetadata.height || 0

  // 3. Create watermarked variant (800x800 max, visible watermark)
  const watermarkedBuffer = await sharp(buffer)
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .composite([
      {
        input: Buffer.from(`
          <svg width="300" height="60">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
              </filter>
            </defs>
            <text
              x="150"
              y="40"
              font-family="Arial, sans-serif"
              font-size="24"
              font-weight="600"
              fill="white"
              opacity="0.7"
              text-anchor="middle"
              filter="url(#shadow)"
            >
              MadeBuy.com
            </text>
          </svg>
        `),
        gravity: 'southeast',
      },
    ])
    .jpeg({ quality: 85 })
    .toBuffer()

  // 4. Create thumbnail (400x400, no watermark for admin)
  const thumbnailBuffer = await sharp(buffer)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  // 5. Upload all variants to R2
  const timestamp = Date.now()
  const baseName = fileName.replace(/\.[^/.]+$/, '') // Remove extension

  const [original, watermarked, thumbnail] = await Promise.all([
    // Original (full resolution, no watermark)
    uploadToR2({
      tenantId,
      fileName: `${baseName}-original-${timestamp}.jpg`,
      buffer,
      contentType: 'image/jpeg',
      metadata: {
        ...metadata,
        variant: 'original',
        hash: imageHash,
        uploadedAt: new Date().toISOString(),
      },
    }),

    // Watermarked (public display)
    uploadToR2({
      tenantId,
      fileName: `${baseName}-watermarked-${timestamp}.jpg`,
      buffer: watermarkedBuffer,
      contentType: 'image/jpeg',
      metadata: {
        ...metadata,
        variant: 'watermarked',
        hash: imageHash,
      },
    }),

    // Thumbnail (admin/listings)
    uploadToR2({
      tenantId,
      fileName: `${baseName}-thumb-${timestamp}.jpg`,
      buffer: thumbnailBuffer,
      contentType: 'image/jpeg',
      metadata: {
        ...metadata,
        variant: 'thumbnail',
        hash: imageHash,
      },
    }),
  ])

  return {
    original: {
      ...original,
      width,
      height,
      hash: imageHash,
    },
    watermarked,
    thumbnail,
  }
}

/**
 * Calculate pHash for an existing image buffer
 * Useful for comparing images to detect theft
 */
export async function calculateImageHash(buffer: Buffer): Promise<string> {
  return await phash(buffer)
}

/**
 * Compare two pHashes to determine similarity
 * Returns hamming distance (0 = identical, <10 = very similar)
 */
export function compareHashes(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hashes must be the same length')
  }

  let distance = 0
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++
    }
  }

  return distance
}

/**
 * Check if two images are likely the same or derivatives
 * Hamming distance < 10 indicates high similarity
 */
export function areImagesSimilar(hash1: string, hash2: string, threshold = 10): boolean {
  const distance = compareHashes(hash1, hash2)
  return distance < threshold
}
