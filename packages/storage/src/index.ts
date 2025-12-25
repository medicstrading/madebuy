/**
 * @madebuy/storage
 * R2 storage utilities and image processing for MadeBuy platform
 */

// Export R2 utilities
export {
  uploadToR2,
  deleteFromR2,
  getFromR2,
  getPublicUrl,
  type UploadOptions,
} from './r2'

// Export image variant processing
export {
  processImageWithVariants,
  optimizeForPlatform,
  PLATFORM_VARIANTS,
  STANDARD_VARIANTS,
  type ProcessImageOptions,
  type OptimizeForPlatformOptions,
  type VariantSpec,
} from './image-variants'
