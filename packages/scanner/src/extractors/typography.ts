import type { CheerioAPI } from 'cheerio'
import type { Element } from 'domhandler'
import type { TypographyPreset } from '@madebuy/shared'
import type { DetectedFont, TypographyExtractionResult } from '../types'

// Map detected fonts to MadeBuy typography presets
const FONT_TO_PRESET_MAP: Record<string, TypographyPreset> = {
  // Modern preset (Outfit)
  'outfit': 'modern',
  'inter': 'modern',
  'roboto': 'modern',
  'poppins': 'modern',
  'source sans pro': 'modern',
  'source sans 3': 'modern',
  'nunito': 'modern',
  'nunito sans': 'modern',
  'raleway': 'modern',

  // Classic preset (Merriweather + Open Sans)
  'merriweather': 'classic',
  'open sans': 'classic',
  'georgia': 'classic',
  'times new roman': 'classic',
  'lora': 'classic',
  'pt serif': 'classic',
  'libre baskerville': 'classic',
  'noto serif': 'classic',

  // Elegant preset (Playfair Display + Lato)
  'playfair display': 'elegant',
  'lato': 'elegant',
  'cormorant': 'elegant',
  'cormorant garamond': 'elegant',
  'crimson text': 'elegant',
  'eb garamond': 'elegant',
  'spectral': 'elegant',

  // Bold preset (Montserrat + Roboto)
  'montserrat': 'bold',
  'oswald': 'bold',
  'bebas neue': 'bold',
  'anton': 'bold',
  'barlow': 'bold',
  'barlow condensed': 'bold',
  'archivo black': 'bold',

  // Minimal preset (Space Grotesk)
  'space grotesk': 'minimal',
  'dm sans': 'minimal',
  'work sans': 'minimal',
  'manrope': 'minimal',
  'plus jakarta sans': 'minimal',
  'sora': 'minimal',
}

/**
 * Extracts typography information from HTML and CSS
 */
export function extractTypography(
  $: CheerioAPI,
  css: string[]
): TypographyExtractionResult {
  const detectedFonts: DetectedFont[] = []

  // 1. Parse Google Fonts links (most reliable)
  extractGoogleFonts($, detectedFonts)

  // 2. Parse @font-face declarations
  const cssContent = css.join('\n') + extractInlineStyles($)
  extractFontFace(cssContent, detectedFonts)

  // 3. Parse font-family from CSS
  extractFontFamily(cssContent, detectedFonts)

  // 4. Check for Adobe Fonts (Typekit)
  extractAdobeFonts($, detectedFonts)

  // Determine heading and body fonts
  const headingFont = findFontByUsage(detectedFonts, 'heading')
  const bodyFont = findFontByUsage(detectedFonts, 'body') || findFontByUsage(detectedFonts, 'unknown')

  // Match to preset
  const matchedPreset = matchFontToPreset(headingFont, bodyFont)

  // Calculate confidence
  let confidence = 0
  if (matchedPreset) {
    // Higher confidence if we detected from Google Fonts
    const hasGoogleFont = detectedFonts.some(f => f.source === 'google-fonts-link')
    if (hasGoogleFont) {
      confidence = 0.9
    } else if (detectedFonts.length > 0) {
      confidence = 0.7
    } else {
      confidence = 0.5
    }
  } else if (detectedFonts.length > 0) {
    confidence = 0.4 // Found fonts but couldn't match preset
  }

  return {
    detectedFonts,
    matchedPreset: matchedPreset || 'modern', // Default to modern
    headingFont,
    bodyFont,
    confidence,
  }
}

/**
 * Extracts fonts from Google Fonts link tags
 */
function extractGoogleFonts($: CheerioAPI, fonts: DetectedFont[]): void {
  // Match: https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans
  $('link[href*="fonts.googleapis.com"]').each((_: number, el: Element) => {
    const href = $(el).attr('href') || ''

    // Parse family parameter(s)
    const familyMatches = href.matchAll(/family=([^&:]+)/g)

    for (const match of familyMatches) {
      const fontName = decodeURIComponent(match[1].replace(/\+/g, ' '))

      // Extract weights if present
      const weightsMatch = href.match(new RegExp(`family=${match[1]}[^&]*:wght@([\\d;]+)`))
      const weights = weightsMatch
        ? weightsMatch[1].split(';').map((w: string) => parseInt(w, 10)).filter((w: number) => !isNaN(w))
        : [400]

      fonts.push({
        name: fontName,
        source: 'google-fonts-link',
        usage: guessUsageFromWeights(weights),
        weights,
      })
    }
  })
}

/**
 * Extracts fonts from @font-face declarations
 */
function extractFontFace(css: string, fonts: DetectedFont[]): void {
  const fontFaceRegex = /@font-face\s*\{[^}]*font-family:\s*["']?([^"';}\n]+)["']?[^}]*\}/gi
  let match

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const fontName = match[1].trim()

    // Skip system fonts and generic families
    if (isSystemFont(fontName)) continue

    // Check if already detected
    if (fonts.some(f => f.name.toLowerCase() === fontName.toLowerCase())) continue

    fonts.push({
      name: fontName,
      source: 'font-face',
      usage: 'unknown',
      weights: [400],
    })
  }
}

/**
 * Extracts fonts from font-family CSS declarations
 */
function extractFontFamily(css: string, fonts: DetectedFont[]): void {
  // Match font-family in body/heading selectors
  const patterns = [
    { regex: /body[^{]*\{[^}]*font-family:\s*["']?([^"';},]+)/gi, usage: 'body' as const },
    { regex: /h[1-3][^{]*\{[^}]*font-family:\s*["']?([^"';},]+)/gi, usage: 'heading' as const },
    { regex: /\.heading[^{]*\{[^}]*font-family:\s*["']?([^"';},]+)/gi, usage: 'heading' as const },
  ]

  for (const { regex, usage } of patterns) {
    let match
    while ((match = regex.exec(css)) !== null) {
      const fontName = match[1].trim()

      if (isSystemFont(fontName)) continue
      if (fonts.some(f => f.name.toLowerCase() === fontName.toLowerCase())) continue

      fonts.push({
        name: fontName,
        source: 'css-font-family',
        usage,
        weights: [400],
      })
    }
  }
}

/**
 * Extracts fonts from Adobe Fonts (Typekit)
 */
function extractAdobeFonts($: CheerioAPI, fonts: DetectedFont[]): void {
  // Check for use.typekit.net links
  const typekitLink = $('link[href*="use.typekit.net"]').attr('href')

  if (typekitLink) {
    // We can't parse the actual fonts from Typekit without fetching
    // Just note that Adobe Fonts are in use
    fonts.push({
      name: 'Adobe Fonts (detected)',
      source: 'adobe-fonts',
      usage: 'unknown',
      weights: [],
    })
  }
}

/**
 * Matches detected fonts to a MadeBuy typography preset
 */
function matchFontToPreset(
  headingFont: string | null,
  bodyFont: string | null
): TypographyPreset | null {
  // Try heading font first (more distinctive for branding)
  if (headingFont) {
    const normalized = headingFont.toLowerCase().trim()
    if (FONT_TO_PRESET_MAP[normalized]) {
      return FONT_TO_PRESET_MAP[normalized]
    }
  }

  // Try body font
  if (bodyFont) {
    const normalized = bodyFont.toLowerCase().trim()
    if (FONT_TO_PRESET_MAP[normalized]) {
      return FONT_TO_PRESET_MAP[normalized]
    }
  }

  return null
}

/**
 * Finds font by usage type
 */
function findFontByUsage(fonts: DetectedFont[], usage: 'heading' | 'body' | 'unknown'): string | null {
  const font = fonts.find(f => f.usage === usage)
  return font?.name || null
}

/**
 * Guesses font usage based on weights
 */
function guessUsageFromWeights(weights: number[]): 'heading' | 'body' | 'unknown' {
  // Fonts with heavier weights are typically for headings
  const hasHeavyWeight = weights.some(w => w >= 600)
  const hasLightWeight = weights.some(w => w <= 400)

  if (hasHeavyWeight && !hasLightWeight) {
    return 'heading'
  } else if (hasLightWeight && !hasHeavyWeight) {
    return 'body'
  }

  return 'unknown'
}

/**
 * Checks if font name is a system/generic font
 */
function isSystemFont(fontName: string): boolean {
  const systemFonts = [
    'arial', 'helvetica', 'verdana', 'tahoma', 'trebuchet ms',
    'times', 'times new roman', 'georgia', 'garamond', 'courier',
    'courier new', 'comic sans ms', 'impact', 'lucida',
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui',
    'inherit', 'initial', 'unset',
  ]

  return systemFonts.includes(fontName.toLowerCase().trim())
}

/**
 * Extracts inline <style> tags content
 */
function extractInlineStyles($: CheerioAPI): string {
  let css = ''
  $('style').each((_: number, el: Element) => {
    css += $(el).text() + '\n'
  })
  return css
}
