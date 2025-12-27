import sharp from 'sharp'
import { uploadToR2 } from './r2'
import { uploadToLocal } from './local-storage'
import type { MediaVariants, MediaVariant, SocialPlatform } from '@madebuy/shared'

// Storage backend configuration
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true'

// Unified upload function that uses either R2 or local storage
async function uploadFile(options: {
  tenantId: string
  fileName: string
  buffer: Buffer
  contentType: string
  metadata?: Record<string, string>
}): Promise<MediaVariant> {
  if (USE_LOCAL_STORAGE) {
    return await uploadToLocal(options)
  } else {
    return await uploadToR2(options)
  }
}

export interface VariantSpec {
  name: keyof MediaVariants
  width: number
  height: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

// Platform-optimized image specifications
export const PLATFORM_VARIANTS: Record<SocialPlatform, VariantSpec> = {
  instagram: {
    name: 'instagramFeed',
    width: 1080,
    height: 1350,
    fit: 'cover', // 4:5 ratio for Instagram feed
  },
  facebook: {
    name: 'facebookFeed',
    width: 1200,
    height: 1200,
    fit: 'cover', // 1:1 ratio for Facebook
  },
  pinterest: {
    name: 'pinterest',
    width: 1000,
    height: 1500,
    fit: 'cover', // 2:3 ratio for Pinterest
  },
  tiktok: {
    name: 'tiktok',
    width: 1080,
    height: 1920,
    fit: 'cover', // 9:16 ratio for TikTok
  },
  youtube: {
    name: 'original', // YouTube handles video, not optimized images
    width: 1920,
    height: 1080,
    fit: 'cover',
  },
  'website-blog': {
    name: 'large', // Blog uses large web-optimized images
    width: 1200,
    height: 630,
    fit: 'cover', // Standard OG image ratio
  },
}

// Standard image variants for website
export const STANDARD_VARIANTS: VariantSpec[] = [
  {
    name: 'original',
    width: 2400,
    height: 2400,
    fit: 'inside', // Keep aspect ratio, max dimensions
  },
  {
    name: 'large',
    width: 1200,
    height: 1200,
    fit: 'inside',
  },
  {
    name: 'thumb',
    width: 400,
    height: 400,
    fit: 'cover', // Square thumbnail
  },
]

export interface ProcessImageOptions {
  tenantId: string
  fileName: string
  imageBuffer: Buffer
  platforms?: SocialPlatform[]
}

export async function processImageWithVariants(
  options: ProcessImageOptions
): Promise<MediaVariants> {
  const { tenantId, fileName, imageBuffer, platforms = [] } = options

  const variants: Partial<MediaVariants> = {}

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata()

  // Create standard variants
  for (const spec of STANDARD_VARIANTS) {
    const variant = await createVariant(imageBuffer, spec, tenantId, fileName)
    variants[spec.name] = variant
  }

  // Create platform-optimized variants
  for (const platform of platforms) {
    const spec = PLATFORM_VARIANTS[platform]
    if (spec && spec.name !== 'original') {
      const variant = await createVariant(imageBuffer, spec, tenantId, fileName)
      variants[spec.name] = variant
    }
  }

  return variants as MediaVariants
}

async function createVariant(
  imageBuffer: Buffer,
  spec: VariantSpec,
  tenantId: string,
  fileName: string
): Promise<MediaVariant> {
  let processedImage = sharp(imageBuffer)

  // Resize based on spec
  processedImage = processedImage.resize(spec.width, spec.height, {
    fit: spec.fit || 'cover',
    position: 'center',
  })

  // Optimize for web
  processedImage = processedImage
    .jpeg({ quality: 85, progressive: true })
    .withMetadata({ orientation: undefined }) // Strip orientation, apply it

  const buffer = await processedImage.toBuffer()
  const metadata = await sharp(buffer).metadata()

  // Upload to storage (R2 or local)
  const variantFileName = `${spec.name}-${fileName}`
  const uploadResult = await uploadFile({
    tenantId,
    fileName: variantFileName,
    buffer,
    contentType: 'image/jpeg',
    metadata: {
      variant: spec.name,
    },
  })

  return {
    ...uploadResult,
    width: metadata.width || 0,
    height: metadata.height || 0,
  }
}

export interface OptimizeForPlatformOptions {
  imageBuffer: Buffer
  platform: SocialPlatform
  tenantId: string
  fileName: string
}

export async function optimizeForPlatform(
  options: OptimizeForPlatformOptions
): Promise<MediaVariant> {
  const { imageBuffer, platform, tenantId, fileName } = options
  const spec = PLATFORM_VARIANTS[platform]

  return await createVariant(imageBuffer, spec, tenantId, fileName)
}
