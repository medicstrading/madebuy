import { ERROR_MESSAGES, ScanErrorCode } from './types'

export interface FetchOptions {
  url: string
  timeout?: number
}

export interface FetchResult {
  html: string
  finalUrl: string
  stylesheets: string[]
}

export class ScannerError extends Error {
  code: ScanErrorCode

  constructor(code: ScanErrorCode, message?: string) {
    super(message || ERROR_MESSAGES[code])
    this.code = code
    this.name = 'ScannerError'
  }
}

/**
 * Fetches HTML and linked stylesheets from a URL
 * Handles redirects and timeout
 */
export async function fetchHtml(options: FetchOptions): Promise<FetchResult> {
  const { url, timeout = 15000 } = options

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    throw new ScannerError(ScanErrorCode.FETCH_FAILED, 'Invalid URL format')
  }

  // Fetch with timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MadeBuy/1.0; +https://madebuy.com.au)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      redirect: 'follow',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new ScannerError(ScanErrorCode.BLOCKED)
      }
      throw new ScannerError(
        ScanErrorCode.FETCH_FAILED,
        `HTTP ${response.status}`,
      )
    }

    const contentType = response.headers.get('content-type') || ''
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml')
    ) {
      throw new ScannerError(ScanErrorCode.INVALID_HTML, 'Response is not HTML')
    }

    const html = await response.text()
    if (!html || html.trim().length < 100) {
      throw new ScannerError(ScanErrorCode.NO_CONTENT)
    }

    // Extract stylesheet URLs from HTML
    const stylesheets = extractStylesheetUrls(html, response.url)

    return {
      html,
      finalUrl: response.url,
      stylesheets,
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ScannerError) {
      throw error
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ScannerError(ScanErrorCode.TIMEOUT)
      }
      throw new ScannerError(ScanErrorCode.FETCH_FAILED, error.message)
    }

    throw new ScannerError(ScanErrorCode.FETCH_FAILED)
  }
}

/**
 * Fetches external CSS stylesheets (up to 3)
 */
export async function fetchStylesheets(
  urls: string[],
  timeout = 5000,
): Promise<string[]> {
  const cssContents: string[] = []
  const limitedUrls = urls.slice(0, 3) // Only fetch first 3

  await Promise.all(
    limitedUrls.map(async (url) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MadeBuy/1.0)',
          },
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const css = await response.text()
          cssContents.push(css)
        }
      } catch {
        // Silently ignore failed stylesheet fetches
      }
    }),
  )

  return cssContents
}

/**
 * Extracts stylesheet URLs from HTML
 */
function extractStylesheetUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = []

  // Match <link rel="stylesheet" href="...">
  const linkRegex =
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi
  const linkRegex2 =
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi

  let match: RegExpExecArray | null = null
  match = linkRegex.exec(html)
  while (match !== null) {
    urls.push(resolveUrl(match[1], baseUrl))
    match = linkRegex.exec(html)
  }
  match = linkRegex2.exec(html)
  while (match !== null) {
    urls.push(resolveUrl(match[1], baseUrl))
    match = linkRegex2.exec(html)
  }

  // Filter to only external stylesheets (not inline or data URIs)
  return urls.filter(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
  )
}

/**
 * Resolves relative URL to absolute
 */
export function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href
  } catch {
    return relativeUrl
  }
}
