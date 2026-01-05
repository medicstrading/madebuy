import type { CheerioAPI, Cheerio } from 'cheerio'
import type { AnyNode } from 'domhandler'
import type { LogoExtractionResult, LogoSource } from '../types'
import { resolveUrl } from '../fetcher'

// Logo detection selectors in priority order
const LOGO_SELECTORS: { selector: string; source: LogoSource }[] = [
  { selector: 'header img[class*="logo" i]', source: 'header-logo-class' },
  { selector: 'header [class*="logo" i] img', source: 'header-logo-class' },
  { selector: 'header a[class*="logo" i] img', source: 'header-logo-class' },
  { selector: 'img[class*="logo" i]', source: 'header-logo-class' },
  { selector: 'header a > img:first-of-type', source: 'header-link-img' },
  { selector: 'nav a > img:first-of-type', source: 'header-link-img' },
  { selector: '[class*="navbar" i] a > img:first-of-type', source: 'header-link-img' },
  { selector: '#logo img', source: 'header-logo-class' },
  { selector: '.logo img', source: 'header-logo-class' },
]

const FALLBACK_SELECTORS: { selector: string; source: LogoSource; attr?: string }[] = [
  { selector: 'meta[property="og:image"]', source: 'og-image', attr: 'content' },
  { selector: 'link[rel="icon"][sizes="192x192"]', source: 'large-favicon', attr: 'href' },
  { selector: 'link[rel="icon"][sizes="180x180"]', source: 'large-favicon', attr: 'href' },
  { selector: 'link[rel="apple-touch-icon"]', source: 'apple-touch-icon', attr: 'href' },
  { selector: 'link[rel="apple-touch-icon-precomposed"]', source: 'apple-touch-icon', attr: 'href' },
]

/**
 * Extracts logo from HTML
 */
export function extractLogo(
  $: CheerioAPI,
  baseUrl: string
): LogoExtractionResult {
  // Try main logo selectors first
  for (const { selector, source } of LOGO_SELECTORS) {
    const element = $(selector).first()
    if (element.length > 0) {
      const result = extractFromImgElement($, element, baseUrl, source)
      if (result.logoUrl) {
        return result
      }
    }
  }

  // Check for SVG logos in header
  const svgLogo = $('header svg[class*="logo" i], [class*="logo" i] svg').first()
  if (svgLogo.length > 0) {
    // SVG logos can't be easily downloaded, but we can note they exist
    return {
      logoUrl: null,
      logoBuffer: null,
      altText: svgLogo.attr('aria-label') || null,
      dimensions: null,
      confidence: 0.6,
      source: 'header-svg',
    }
  }

  // Try fallback selectors
  for (const { selector, source, attr } of FALLBACK_SELECTORS) {
    const element = $(selector).first()
    if (element.length > 0) {
      const rawUrl = attr ? element.attr(attr) : element.attr('src')
      if (rawUrl) {
        const absoluteUrl = resolveUrl(rawUrl, baseUrl)
        return {
          logoUrl: absoluteUrl,
          logoBuffer: null,
          altText: null,
          dimensions: null,
          confidence: source === 'og-image' ? 0.4 : 0.5,
          source,
        }
      }
    }
  }

  // No logo found
  return {
    logoUrl: null,
    logoBuffer: null,
    altText: null,
    dimensions: null,
    confidence: 0,
    source: null,
  }
}

/**
 * Extracts logo info from an img element
 */
function extractFromImgElement(
  $: CheerioAPI,
  element: Cheerio<AnyNode>,
  baseUrl: string,
  source: LogoSource
): LogoExtractionResult {
  // Get src attribute (handle srcset, data-src, etc.)
  let rawUrl = element.attr('src')

  // Check data-src for lazy loading
  if (!rawUrl || rawUrl.startsWith('data:')) {
    rawUrl = element.attr('data-src') || element.attr('data-lazy-src')
  }

  // Check srcset for highest resolution
  const srcset = element.attr('srcset')
  if (srcset) {
    const highestRes = parseHighestResFromSrcset(srcset)
    if (highestRes) {
      rawUrl = highestRes
    }
  }

  if (!rawUrl || rawUrl.startsWith('data:')) {
    return {
      logoUrl: null,
      logoBuffer: null,
      altText: null,
      dimensions: null,
      confidence: 0,
      source: null,
    }
  }

  const absoluteUrl = resolveUrl(rawUrl, baseUrl)
  const altText = element.attr('alt') || null

  // Try to get dimensions
  const width = parseInt(element.attr('width') || '0', 10)
  const height = parseInt(element.attr('height') || '0', 10)
  const dimensions = width && height ? { width, height } : null

  return {
    logoUrl: absoluteUrl,
    logoBuffer: null,
    altText,
    dimensions,
    confidence: 0.85,
    source,
  }
}

/**
 * Parses srcset and returns highest resolution URL
 */
function parseHighestResFromSrcset(srcset: string): string | null {
  const entries = srcset.split(',').map(entry => {
    const parts = entry.trim().split(/\s+/)
    const url = parts[0]
    const descriptor = parts[1] || '1x'

    let multiplier = 1
    if (descriptor.endsWith('x')) {
      multiplier = parseFloat(descriptor) || 1
    } else if (descriptor.endsWith('w')) {
      // Width descriptor - assume 1x for now
      multiplier = parseInt(descriptor, 10) / 100 || 1
    }

    return { url, multiplier }
  })

  // Sort by multiplier descending and return highest
  entries.sort((a, b) => b.multiplier - a.multiplier)
  return entries[0]?.url || null
}

/**
 * Downloads logo from URL
 */
export async function downloadLogo(
  logoUrl: string,
  timeout = 10000
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(logoUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MadeBuy/1.0)',
        'Accept': 'image/*',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/png'

    // Validate it's an image
    if (!contentType.startsWith('image/')) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate minimum size (at least 1KB for a real logo)
    if (buffer.length < 1024) {
      return null
    }

    // Validate maximum size (skip if > 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return null
    }

    return { buffer, contentType }
  } catch {
    return null
  }
}

/**
 * Detects content type from buffer magic bytes
 */
export function detectContentType(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif'
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp'
  }
  if (buffer.toString('utf8', 0, 5) === '<?xml' || buffer.toString('utf8', 0, 4) === '<svg') {
    return 'image/svg+xml'
  }

  return 'image/png' // Default fallback
}
