/**
 * Video Processing Utilities
 *
 * Handles video thumbnail generation and metadata extraction using ffmpeg.
 * Requires fluent-ffmpeg and @ffmpeg-installer/ffmpeg packages.
 */

import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { MediaVariant, VideoMetadata } from '@madebuy/shared'
import ffmpeg from 'fluent-ffmpeg'
import sharp from 'sharp'
import { uploadToLocal } from './local-storage'
import { uploadToR2 } from './r2'

// Lazy initialize ffmpeg path to avoid build-time issues
let ffmpegInitialized = false
function ensureFfmpegPath() {
  if (!ffmpegInitialized) {
    try {
      // Dynamic import to avoid build-time execution
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      ffmpeg.setFfmpegPath(ffmpegInstaller.path)
      ffmpegInitialized = true
    } catch (error) {
      console.warn('ffmpeg not available:', error)
    }
  }
}

const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true'

/**
 * Thumbnail size specifications
 */
export const THUMBNAIL_SIZES = {
  large: { width: 1280, height: 720 },
  medium: { width: 640, height: 360 },
  small: { width: 320, height: 180 },
  thumb: { width: 160, height: 90 },
} as const

export interface VideoProcessingOptions {
  tenantId: string
  videoBuffer: Buffer
  fileName: string
  mimeType: string
}

export interface VideoProcessingResult {
  metadata: VideoMetadata
  thumbnails: {
    large: MediaVariant
    medium: MediaVariant
    small: MediaVariant
    thumb: MediaVariant
  }
}

export interface ExtractedMetadata {
  duration: number
  width: number
  height: number
  codec: string
  bitrate: number
  frameRate: number
  hasAudio: boolean
}

/**
 * Extract video metadata using ffprobe
 */
export async function extractVideoMetadata(
  videoPath: string,
): Promise<ExtractedMetadata> {
  ensureFfmpegPath()
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to extract video metadata: ${err.message}`))
        return
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio')

      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }

      // Parse frame rate (can be "30/1" or "29.97" format)
      let frameRate = 30
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/')
        if (parts.length === 2) {
          frameRate = parseInt(parts[0], 10) / parseInt(parts[1], 10)
        } else {
          frameRate = parseFloat(videoStream.r_frame_rate)
        }
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        bitrate: parseInt(String(metadata.format.bit_rate || 0), 10) || 0,
        frameRate,
        hasAudio: !!audioStream,
      })
    })
  })
}

/**
 * Generate a thumbnail from a video at a specific timestamp
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number | string,
): Promise<void> {
  ensureFfmpegPath()
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        folder: outputPath.substring(0, outputPath.lastIndexOf('/')),
        filename: outputPath.substring(outputPath.lastIndexOf('/') + 1),
        timestamps: [
          typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp,
        ],
      })
      .on('end', () => resolve())
      .on('error', (err) =>
        reject(new Error(`Thumbnail generation failed: ${err.message}`)),
      )
  })
}

/**
 * Process video and generate thumbnails at multiple sizes
 */
export async function processVideo(
  options: VideoProcessingOptions,
): Promise<VideoProcessingResult> {
  const { tenantId, videoBuffer, fileName, mimeType } = options

  // Create temp directory for processing
  const tempId = randomBytes(8).toString('hex')
  const tempDir = join(tmpdir(), `madebuy-video-${tempId}`)
  await fs.mkdir(tempDir, { recursive: true })

  const videoPath = join(tempDir, `input${getExtension(mimeType)}`)
  const baseThumbnailPath = join(tempDir, 'thumb')

  try {
    // Write video buffer to temp file
    await fs.writeFile(videoPath, videoBuffer)

    // Extract metadata
    const rawMetadata = await extractVideoMetadata(videoPath)

    // Determine thumbnail capture point (25% or 1 second, whichever is greater)
    const capturePoint = Math.max(1, rawMetadata.duration * 0.25)
    const captureTimestamp = formatTimestamp(capturePoint)

    // Generate full-size thumbnail
    const fullThumbPath = `${baseThumbnailPath}-full.jpg`
    await generateThumbnailAtTimestamp(
      videoPath,
      fullThumbPath,
      captureTimestamp,
    )

    // Read the full thumbnail and create resized versions
    const fullThumbBuffer = await fs.readFile(fullThumbPath)

    // Upload thumbnails at different sizes
    const uploadFn = USE_LOCAL_STORAGE ? uploadToLocal : uploadToR2
    const thumbnails: Record<string, MediaVariant> = {}

    for (const [sizeName, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
      // Resize using sharp
      const resizedBuffer = await sharp(fullThumbBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer()

      // Upload
      const thumbFileName = `thumbnails/${sizeName}-${fileName.replace(/\.[^.]+$/, '.jpg')}`
      const variant = await uploadFn({
        tenantId,
        fileName: thumbFileName,
        buffer: resizedBuffer,
        contentType: 'image/jpeg',
        metadata: {
          sourceVideo: fileName,
          size: sizeName,
        },
      })

      thumbnails[sizeName] = {
        ...variant,
        width: dimensions.width,
        height: dimensions.height,
      }
    }

    // Build metadata result
    const metadata: VideoMetadata = {
      duration: rawMetadata.duration,
      width: rawMetadata.width,
      height: rawMetadata.height,
      codec: rawMetadata.codec,
      bitrate: rawMetadata.bitrate,
      frameRate: rawMetadata.frameRate,
      hasAudio: rawMetadata.hasAudio,
      thumbnailKey: thumbnails.large.key,
      thumbnailUrl: thumbnails.large.url,
    }

    return {
      metadata,
      thumbnails: thumbnails as VideoProcessingResult['thumbnails'],
    }
  } finally {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Generate thumbnail at specific timestamp using ffmpeg directly
 */
async function generateThumbnailAtTimestamp(
  videoPath: string,
  outputPath: string,
  timestamp: string,
): Promise<void> {
  ensureFfmpegPath()
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .output(outputPath)
      .outputOptions(['-vf', 'scale=-1:720'])
      .on('end', () => resolve())
      .on('error', (err) =>
        reject(new Error(`Thumbnail generation failed: ${err.message}`)),
      )
      .run()
  })
}

/**
 * Get file extension from mime type
 */
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
  }
  return extensions[mimeType] || '.mp4'
}

/**
 * Format seconds to HH:MM:SS.mmm timestamp
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`
}

/**
 * Validate video duration against maximum allowed
 */
export function validateVideoDuration(
  duration: number,
  maxDuration: number,
): boolean {
  return duration <= maxDuration
}

/**
 * Get optimal thumbnail capture points for a video
 * Returns timestamps at 25%, 50%, and 75% of the video
 */
export function getOptimalCapturePoints(duration: number): number[] {
  if (duration <= 0) return [0]

  return [
    Math.max(0.5, duration * 0.25),
    duration * 0.5,
    Math.min(duration - 0.5, duration * 0.75),
  ]
}
