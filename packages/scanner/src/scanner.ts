import * as cheerio from 'cheerio'
import { fetchHtml, fetchStylesheets, ScannerError } from './fetcher'
import { extractColors } from './extractors/colors'
import { extractTypography } from './extractors/typography'
import { extractLogo, downloadLogo, detectContentType } from './extractors/logo'
import { extractNavigation } from './extractors/navigation'
import { extractSections } from './extractors/sections'
import { recommendTemplate, detectsProducts } from './extractors/template-matcher'
import type { ScanOptions, ScanResult, ExtractedDesign } from './types'
import { ScanErrorCode, ERROR_MESSAGES } from './types'

// These will be dynamically imported to avoid circular deps
let uploadToR2: typeof import('@madebuy/storage').uploadToR2 | undefined
let mediaRepo: typeof import('@madebuy/db').media | undefined

/**
 * Website Scanner - extracts design elements from a URL
 */
export class WebsiteScanner {
  private storageLoaded = false

  /**
   * Lazily load storage and database modules
   */
  private async loadStorage(): Promise<void> {
    if (this.storageLoaded) return

    try {
      const storage = await import('@madebuy/storage')
      uploadToR2 = storage.uploadToR2

      const db = await import('@madebuy/db')
      mediaRepo = db.media

      this.storageLoaded = true
    } catch (error) {
      console.warn('Storage modules not available:', error)
    }
  }

  /**
   * Main scan entry point
   */
  async scan(options: ScanOptions): Promise<ScanResult> {
    const { url, tenantId, timeout = 15000, downloadLogo: shouldDownloadLogo = true } = options
    const limitations: string[] = []
    const errors: string[] = []

    try {
      // Fetch HTML
      const { html, finalUrl, stylesheets } = await fetchHtml({ url, timeout })

      // Parse HTML
      const $ = cheerio.load(html)

      // Fetch external stylesheets
      const cssContents = await fetchStylesheets(stylesheets, 5000)

      // Extract colors
      const colorResult = extractColors($, cssContents)
      if (!colorResult.primary) {
        limitations.push(ERROR_MESSAGES[ScanErrorCode.NO_COLORS_FOUND])
      }

      // Extract typography
      const typographyResult = extractTypography($, cssContents)
      if (typographyResult.matchedPreset === 'modern' && typographyResult.confidence < 0.5) {
        limitations.push(ERROR_MESSAGES[ScanErrorCode.NO_FONTS_FOUND])
      }

      // Extract logo
      const logoResult = extractLogo($, finalUrl)
      let downloadedMediaId: string | null = null

      if (logoResult.logoUrl && shouldDownloadLogo) {
        // Try to download and upload logo
        const downloaded = await downloadLogo(logoResult.logoUrl)
        if (downloaded) {
          await this.loadStorage()

          if (this.storageLoaded && uploadToR2 && mediaRepo) {
            try {
              downloadedMediaId = await this.uploadLogoToR2(
                tenantId,
                downloaded.buffer,
                logoResult.logoUrl,
                downloaded.contentType
              )
            } catch (uploadError) {
              limitations.push(ERROR_MESSAGES[ScanErrorCode.LOGO_DOWNLOAD_FAILED])
              console.error('Logo upload failed:', uploadError)
            }
          }
        } else if (logoResult.source !== 'header-svg') {
          limitations.push(ERROR_MESSAGES[ScanErrorCode.LOGO_DOWNLOAD_FAILED])
        }
      } else if (logoResult.source === 'header-svg') {
        limitations.push('SVG logo detected but cannot be imported. You can upload a PNG/JPG version.')
      }

      // Extract navigation
      const navigationResult = extractNavigation($, finalUrl)
      if (navigationResult.items.length === 0) {
        limitations.push('Could not detect navigation menu. You can add pages manually.')
      }

      // Extract sections
      const sectionsResult = extractSections($)
      if (sectionsResult.length === 0) {
        limitations.push('Could not detect page sections. Using default layout.')
      }

      // Get template recommendation
      const hasProducts = detectsProducts(sectionsResult)
      const templateMatch = recommendTemplate(sectionsResult, hasProducts)

      // Build extracted design
      const extractedDesign: ExtractedDesign = {
        colors: {
          primary: colorResult.primary,
          accent: colorResult.accent,
          confidence: colorResult.confidence,
        },
        typography: {
          headingFont: typographyResult.headingFont,
          bodyFont: typographyResult.bodyFont,
          matchedPreset: typographyResult.matchedPreset,
          detectedFonts: typographyResult.detectedFonts.map(f => f.name),
          confidence: typographyResult.confidence,
        },
        logo: logoResult.logoUrl
          ? {
              sourceUrl: logoResult.logoUrl,
              downloadedMediaId,
            }
          : null,
        navigation: {
          items: navigationResult.items,
          structure: navigationResult.structure,
          confidence: navigationResult.confidence,
        },
        sections: sectionsResult,
        templateMatch,
        limitations,
      }

      return {
        success: true,
        extractedDesign,
        errors,
      }
    } catch (error) {
      if (error instanceof ScannerError) {
        errors.push(error.message)
        return {
          success: false,
          extractedDesign: this.getEmptyDesign(limitations),
          errors,
        }
      }

      errors.push('An unexpected error occurred while scanning the website.')
      console.error('Scanner error:', error)

      return {
        success: false,
        extractedDesign: this.getEmptyDesign(limitations),
        errors,
      }
    }
  }

  /**
   * Uploads logo to R2 and creates media record
   */
  private async uploadLogoToR2(
    tenantId: string,
    buffer: Buffer,
    sourceUrl: string,
    contentType: string
  ): Promise<string> {
    // Determine extension from content type
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    }
    const ext = extMap[contentType] || 'png'

    // Use detected content type from magic bytes for better accuracy
    const detectedType = detectContentType(buffer)
    const finalContentType = detectedType || contentType

    if (!uploadToR2 || !mediaRepo) {
      throw new Error('Storage not loaded')
    }

    // Upload to R2
    const variant = await uploadToR2({
      tenantId,
      fileName: `logo-import.${ext}`,
      buffer,
      contentType: finalContentType,
      metadata: {
        source: 'website-import',
        importedFrom: sourceUrl,
      },
    })

    // Create media record
    const mediaItem = await mediaRepo.createMedia(tenantId, {
      type: 'image',
      mimeType: finalContentType,
      originalFilename: `imported-logo.${ext}`,
      sizeBytes: buffer.length,
      variants: {
        original: variant,
      },
      source: 'import',
      importedFrom: sourceUrl,
    })

    return mediaItem.id
  }

  /**
   * Returns empty design structure for error cases
   */
  private getEmptyDesign(limitations: string[]): ExtractedDesign {
    return {
      colors: {
        primary: null,
        accent: null,
        confidence: 0,
      },
      typography: {
        headingFont: null,
        bodyFont: null,
        matchedPreset: 'modern',
        detectedFonts: [],
        confidence: 0,
      },
      logo: null,
      navigation: {
        items: [],
        structure: 'unknown',
        confidence: 0,
      },
      sections: [],
      templateMatch: {
        recommended: 'classic-store',
        confidence: 0.5,
        reason: 'Default recommendation for e-commerce',
        alternatives: [],
      },
      limitations,
    }
  }
}

/**
 * Convenience function for one-off scans
 */
export async function scanWebsite(options: ScanOptions): Promise<ScanResult> {
  const scanner = new WebsiteScanner()
  return scanner.scan(options)
}
