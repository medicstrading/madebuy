/**
 * @madebuy/storage
 * Storage utilities (R2 and Local) and image/video processing for MadeBuy platform
 */

// Export image variant processing
export {
  type OptimizeForPlatformOptions,
  optimizeForPlatform,
  PLATFORM_VARIANTS,
  type ProcessImageOptions,
  processImageWithVariants,
  STANDARD_VARIANTS,
  type VariantSpec,
} from './image-variants'

// Export Local storage utilities
export {
  deleteFromLocal,
  ensureUploadsDir,
  getFromLocal,
  getLocalPublicUrl,
  type UploadOptions,
  uploadToLocal,
} from './local-storage'
// Export protected image upload (IP protection)
export {
  areImagesSimilar,
  calculateImageHash,
  compareHashes,
  type ProtectedUploadOptions,
  type ProtectedUploadResult,
  uploadProtectedImage,
} from './protected-upload'
// Export R2 utilities
export {
  deleteFromR2,
  getFromR2,
  getPublicUrl,
  getSignedUrl,
  putToR2,
  type UploadOptions as R2UploadOptions,
  uploadToR2,
} from './r2'

// Export video processing utilities
export {
  type ExtractedMetadata,
  extractVideoMetadata,
  generateThumbnail,
  getOptimalCapturePoints,
  processVideo,
  THUMBNAIL_SIZES,
  type VideoProcessingOptions,
  type VideoProcessingResult,
  validateVideoDuration,
} from './video-processing'
