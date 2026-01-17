import type { CheerioAPI } from 'cheerio'
import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'
import type { Element } from 'domhandler'
import type {
  ColorCandidate,
  ColorExtractionResult,
  ColorSource,
} from '../types'

// Enable color name parsing (e.g., "red", "blue")
extend([namesPlugin])

// Priority order for color sources (lower = higher priority)
const SOURCE_PRIORITY: Record<ColorSource, number> = {
  'theme-color-meta': 1,
  'css-variable': 2,
  'button-background': 3,
  'link-color': 4,
  'header-background': 5,
  'heading-color': 6,
  'inline-style': 7,
}

/**
 * Extracts brand colors from HTML and CSS
 */
export function extractColors(
  $: CheerioAPI,
  css: string[],
): ColorExtractionResult {
  const candidates: ColorCandidate[] = []

  // 1. Check theme-color meta tag (most reliable)
  const themeColor = $('meta[name="theme-color"]').attr('content')
  if (themeColor) {
    const normalized = normalizeColor(themeColor)
    if (normalized && isValidBrandColor(normalized)) {
      candidates.push({
        hex: normalized,
        source: 'theme-color-meta',
        frequency: 10, // High weight for meta tag
        priority: SOURCE_PRIORITY['theme-color-meta'],
      })
    }
  }

  // 2. Extract CSS variables from stylesheets and inline styles
  const cssContent = css.join('\n') + extractInlineStyles($)
  extractCssVariables(cssContent, candidates)

  // 3. Extract from button backgrounds
  extractButtonColors($, cssContent, candidates)

  // 4. Extract link colors
  extractLinkColors($, cssContent, candidates)

  // 5. Extract header/nav backgrounds
  extractHeaderColors($, cssContent, candidates)

  // 6. Extract heading colors
  extractHeadingColors($, cssContent, candidates)

  // 7. Extract from inline styles
  extractInlineStyleColors($, candidates)

  // Group similar colors and count frequency
  const grouped = groupSimilarColors(candidates)

  // Sort by priority and frequency
  grouped.sort((a, b) => {
    // First by priority (lower is better)
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    // Then by frequency (higher is better)
    return b.frequency - a.frequency
  })

  // Pick primary and accent
  const primary = grouped[0]?.hex || null
  let accent: string | null = null

  // Find accent (different from primary)
  for (const candidate of grouped.slice(1)) {
    if (
      candidate.hex !== primary &&
      !areSimilarColors(candidate.hex, primary || '')
    ) {
      accent = candidate.hex
      break
    }
  }

  // Calculate confidence
  let confidence = 0
  if (primary) {
    const primaryCandidate = grouped[0]
    if (primaryCandidate.source === 'theme-color-meta') {
      confidence = 0.95
    } else if (primaryCandidate.source === 'css-variable') {
      confidence = 0.85
    } else if (primaryCandidate.frequency >= 3) {
      confidence = 0.7
    } else {
      confidence = 0.5
    }
  }

  return {
    primary,
    accent,
    allColors: grouped,
    confidence,
  }
}

/**
 * Normalizes any color format to hex
 */
function normalizeColor(color: string): string | null {
  try {
    const parsed = colord(color.trim())
    if (parsed.isValid()) {
      return parsed.toHex().toLowerCase()
    }
  } catch {
    // Invalid color
  }
  return null
}

/**
 * Checks if color is a valid brand color (not black, white, or gray)
 */
function isValidBrandColor(hex: string): boolean {
  const parsed = colord(hex)
  const hsl = parsed.toHsl()

  // Exclude pure black and white
  if (hex === '#000000' || hex === '#ffffff') {
    return false
  }

  // Exclude near-grays (low saturation)
  if (hsl.s < 10) {
    return false
  }

  // Exclude very dark or very light colors
  if (hsl.l < 10 || hsl.l > 95) {
    return false
  }

  return true
}

/**
 * Checks if two colors are similar based on hue/saturation/lightness
 */
function areSimilarColors(hex1: string, hex2: string): boolean {
  try {
    const c1 = colord(hex1).toHsl()
    const c2 = colord(hex2).toHsl()

    // Compare HSL values - similar if hue within 30deg, saturation within 20%, lightness within 20%
    const hueDiff = Math.abs(c1.h - c2.h)
    const hueClose = hueDiff < 30 || hueDiff > 330 // Handle hue wrap-around
    const satClose = Math.abs(c1.s - c2.s) < 20
    const lightClose = Math.abs(c1.l - c2.l) < 20

    return hueClose && satClose && lightClose
  } catch {
    return false
  }
}

/**
 * Groups similar colors together, summing their frequencies
 */
function groupSimilarColors(candidates: ColorCandidate[]): ColorCandidate[] {
  const groups: ColorCandidate[] = []

  for (const candidate of candidates) {
    const existingGroup = groups.find((g) =>
      areSimilarColors(g.hex, candidate.hex),
    )

    if (existingGroup) {
      existingGroup.frequency += candidate.frequency
      // Keep higher priority (lower number)
      if (candidate.priority < existingGroup.priority) {
        existingGroup.priority = candidate.priority
        existingGroup.hex = candidate.hex
        existingGroup.source = candidate.source
      }
    } else {
      groups.push({ ...candidate })
    }
  }

  return groups
}

/**
 * Extracts CSS custom properties (variables) that look like brand colors
 */
function extractCssVariables(css: string, candidates: ColorCandidate[]): void {
  // Match patterns like --primary: #xxx, --brand-color: rgb(...), etc.
  const variablePatterns = [
    /--(?:primary|brand|main|accent|theme)(?:-color)?:\s*([^;}\n]+)/gi,
    /--color-(?:primary|brand|main|accent|theme):\s*([^;}\n]+)/gi,
  ]

  for (const pattern of variablePatterns) {
    let match: RegExpExecArray | null = null
    match = pattern.exec(css)
    while (match !== null) {
      const normalized = normalizeColor(match[1])
      if (normalized && isValidBrandColor(normalized)) {
        candidates.push({
          hex: normalized,
          source: 'css-variable',
          frequency: 5,
          priority: SOURCE_PRIORITY['css-variable'],
        })
      }
      match = pattern.exec(css)
    }
  }
}

/**
 * Extracts colors from button elements
 */
function extractButtonColors(
  $: CheerioAPI,
  css: string,
  candidates: ColorCandidate[],
): void {
  // Check inline styles on buttons
  $('button, .btn, [class*="button"], a.btn, input[type="submit"]').each(
    (_: number, el: Element) => {
      const style = $(el).attr('style') || ''
      const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i)
      if (bgMatch) {
        const normalized = normalizeColor(bgMatch[1])
        if (normalized && isValidBrandColor(normalized)) {
          candidates.push({
            hex: normalized,
            source: 'button-background',
            frequency: 2,
            priority: SOURCE_PRIORITY['button-background'],
          })
        }
      }
    },
  )

  // Check CSS for button selectors
  const buttonCssPattern =
    /(?:button|\.btn|\.button)[^{]*\{[^}]*background(?:-color)?:\s*([^;}\n]+)/gi
  let match: RegExpExecArray | null = null
  match = buttonCssPattern.exec(css)
  while (match !== null) {
    const normalized = normalizeColor(match[1])
    if (normalized && isValidBrandColor(normalized)) {
      candidates.push({
        hex: normalized,
        source: 'button-background',
        frequency: 2,
        priority: SOURCE_PRIORITY['button-background'],
      })
    }
    match = buttonCssPattern.exec(css)
  }
}

/**
 * Extracts colors from link elements
 */
function extractLinkColors(
  $: CheerioAPI,
  css: string,
  candidates: ColorCandidate[],
): void {
  // Check CSS for link colors
  const linkCssPattern = /\ba\b[^{]*\{[^}]*color:\s*([^;}\n]+)/gi
  let match
  while ((match = linkCssPattern.exec(css)) !== null) {
    const normalized = normalizeColor(match[1])
    if (normalized && isValidBrandColor(normalized)) {
      candidates.push({
        hex: normalized,
        source: 'link-color',
        frequency: 1,
        priority: SOURCE_PRIORITY['link-color'],
      })
    }
  }

  // Check inline styles on links
  $('a')
    .slice(0, 20)
    .each((_: number, el: Element) => {
      const style = $(el).attr('style') || ''
      const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i)
      if (colorMatch) {
        const normalized = normalizeColor(colorMatch[1])
        if (normalized && isValidBrandColor(normalized)) {
          candidates.push({
            hex: normalized,
            source: 'link-color',
            frequency: 1,
            priority: SOURCE_PRIORITY['link-color'],
          })
        }
      }
    })
}

/**
 * Extracts colors from header/nav elements
 */
function extractHeaderColors(
  $: CheerioAPI,
  css: string,
  candidates: ColorCandidate[],
): void {
  // Check inline styles on header/nav
  $('header, nav, [class*="header"], [class*="navbar"]').each(
    (_: number, el: Element) => {
      const style = $(el).attr('style') || ''
      const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i)
      if (bgMatch) {
        const normalized = normalizeColor(bgMatch[1])
        if (normalized && isValidBrandColor(normalized)) {
          candidates.push({
            hex: normalized,
            source: 'header-background',
            frequency: 2,
            priority: SOURCE_PRIORITY['header-background'],
          })
        }
      }
    },
  )

  // Check CSS for header selectors
  const headerCssPattern =
    /(?:header|nav|\.navbar|\.header)[^{]*\{[^}]*background(?:-color)?:\s*([^;}\n]+)/gi
  let match
  while ((match = headerCssPattern.exec(css)) !== null) {
    const normalized = normalizeColor(match[1])
    if (normalized && isValidBrandColor(normalized)) {
      candidates.push({
        hex: normalized,
        source: 'header-background',
        frequency: 2,
        priority: SOURCE_PRIORITY['header-background'],
      })
    }
  }
}

/**
 * Extracts colors from heading elements
 */
function extractHeadingColors(
  _$: CheerioAPI,
  css: string,
  candidates: ColorCandidate[],
): void {
  // Check CSS for heading colors
  const headingCssPattern = /h[1-3][^{]*\{[^}]*color:\s*([^;}\n]+)/gi
  let match
  while ((match = headingCssPattern.exec(css)) !== null) {
    const normalized = normalizeColor(match[1])
    if (normalized && isValidBrandColor(normalized)) {
      candidates.push({
        hex: normalized,
        source: 'heading-color',
        frequency: 1,
        priority: SOURCE_PRIORITY['heading-color'],
      })
    }
  }
}

/**
 * Extracts colors from any inline style attributes
 */
function extractInlineStyleColors(
  $: CheerioAPI,
  candidates: ColorCandidate[],
): void {
  $('[style]')
    .slice(0, 50)
    .each((_: number, el: Element) => {
      const style = $(el).attr('style') || ''

      // Extract all color values
      const colorMatches = style.matchAll(
        /(?:background-color|color|border-color):\s*([^;]+)/gi,
      )
      for (const match of colorMatches) {
        const normalized = normalizeColor(match[1])
        if (normalized && isValidBrandColor(normalized)) {
          candidates.push({
            hex: normalized,
            source: 'inline-style',
            frequency: 1,
            priority: SOURCE_PRIORITY['inline-style'],
          })
        }
      }
    })
}

/**
 * Extracts inline <style> tags content
 */
function extractInlineStyles($: CheerioAPI): string {
  let css = ''
  $('style').each((_: number, el: Element) => {
    css += `${$(el).text()}\n`
  })
  return css
}
