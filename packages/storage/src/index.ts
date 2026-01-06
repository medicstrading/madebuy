/**
 * @madebuy/storage
 * Storage utilities (R2 and Local) and image/video processing for MadeBuy platform
 */

// Export R2 utilities
export {
  uploadToR2,
  deleteFromR2,
  getFromR2,
  getPublicUrl,
  getSignedUrl,
  putToR2,
  type UploadOptions as R2UploadOptions,
} from './r2'

// Export Local storage utilities
export {
  uploadToLocal,
  deleteFromLocal,
  getFromLocal,
  getLocalPublicUrl,
  ensureUploadsDir,
  type UploadOptions,
} from './local-storage'

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

// Export protected image upload (IP protection)
export {
  uploadProtectedImage,
  calculateImageHash,
  compareHashes,
  areImagesSimilar,
  type ProtectedUploadOptions,
  type ProtectedUploadResult,
} from './protected-upload'

// Export video processing utilities
export {
  processVideo,
  extractVideoMetadata,
  generateThumbnail,
  validateVideoDuration,
  getOptimalCapturePoints,
  THUMBNAIL_SIZES,
  type VideoProcessingOptions,
  type VideoProcessingResult,
  type ExtractedMetadata,
} from './video-processing'
