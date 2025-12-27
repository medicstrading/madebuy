import { createWorker, type Worker } from 'tesseract.js'
import sharp from 'sharp'

/**
 * OCR Result from Tesseract
 */
export interface OCRResult {
  text: string
  confidence: number // 0-100
  lines: string[]
}

/**
 * Preprocess image for better OCR accuracy
 * - Resize to optimal size (2000px width max)
 * - Convert to grayscale
 * - Normalize brightness/contrast
 */
async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(2000, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
    .greyscale() // Better text contrast
    .normalize() // Improve brightness/contrast
    .toBuffer()
}

/**
 * Extract text from invoice image using Tesseract OCR
 */
export async function extractTextFromInvoice(
  imageBuffer: Buffer
): Promise<OCRResult> {
  let worker: Worker | null = null

  try {
    // Preprocess image
    const processedBuffer = await preprocessImage(imageBuffer)

    // Create Tesseract worker
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        // Optional: log progress
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      }
    })

    // Perform OCR
    const result = await worker.recognize(processedBuffer)

    // Extract lines from text
    const lines = result.data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      lines
    }
  } catch (error) {
    console.error('OCR extraction error:', error)
    throw new Error(`Failed to extract text from invoice: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Clean up worker
    if (worker) {
      await worker.terminate()
    }
  }
}

/**
 * Extract text from PDF by converting first page to image
 * Note: For now, this is a placeholder. Full PDF support would require pdf-lib or similar
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer
): Promise<OCRResult> {
  // TODO: Implement PDF to image conversion
  // For MVP, reject PDFs and ask user to upload images instead
  throw new Error('PDF support not yet implemented. Please upload invoice as JPG or PNG.')
}

/**
 * Validate image file for OCR processing
 */
export function validateInvoiceImage(
  file: File | Buffer,
  maxSizeBytes: number = 20 * 1024 * 1024 // 20MB default
): { valid: boolean; error?: string } {
  if (file instanceof File) {
    // File object validation
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxSizeBytes / (1024 * 1024)}MB`
      }
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload JPG or PNG image'
      }
    }
  } else {
    // Buffer validation
    if (file.length > maxSizeBytes) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${maxSizeBytes / (1024 * 1024)}MB`
      }
    }
  }

  return { valid: true }
}
