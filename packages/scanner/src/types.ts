import type { TypographyPreset, WebsiteTemplate } from '@madebuy/shared'

// Color extraction types
export interface ColorCandidate {
  hex: string
  source: ColorSource
  frequency: number
  priority: number
}

export type ColorSource =
  | 'theme-color-meta'
  | 'css-variable'
  | 'button-background'
  | 'link-color'
  | 'header-background'
  | 'heading-color'
  | 'inline-style'

export interface ColorExtractionResult {
  primary: string | null
  accent: string | null
  allColors: ColorCandidate[]
  confidence: number
}

// Typography extraction types
export interface DetectedFont {
  name: string
  source: FontSource
  usage: 'heading' | 'body' | 'unknown'
  weights: number[]
}

export type FontSource =
  | 'google-fonts-link'
  | 'font-face'
  | 'css-font-family'
  | 'adobe-fonts'

export interface TypographyExtractionResult {
  detectedFonts: DetectedFont[]
  matchedPreset: TypographyPreset | null
  headingFont: string | null
  bodyFont: string | null
  confidence: number
}

// Logo extraction types
export type LogoSource =
  | 'header-logo-class'
  | 'header-link-img'
  | 'header-svg'
  | 'og-image'
  | 'large-favicon'
  | 'apple-touch-icon'

export interface LogoExtractionResult {
  logoUrl: string | null
  logoBuffer: Buffer | null
  altText: string | null
  dimensions: { width: number; height: number } | null
  confidence: number
  source: LogoSource | null
}

// Navigation extraction types
export interface NavItem {
  label: string
  href: string
  hasSubmenu?: boolean
}

export type NavStructure = 'simple' | 'mega-menu' | 'unknown'

export interface NavigationExtractionResult {
  items: NavItem[]
  structure: NavStructure
  confidence: number
}

// Section detection types
export type SectionType =
  | 'hero'
  | 'product-grid'
  | 'testimonials'
  | 'about'
  | 'contact'
  | 'features'
  | 'gallery'
  | 'faq'
  | 'cta'
  | 'unknown'

export interface DetectedSection {
  type: SectionType
  confidence: number
  selector: string
  indicators: string[]
}

// Template recommendation types
export interface TemplateRecommendation {
  recommended: WebsiteTemplate
  confidence: number
  reason: string
  alternatives: {
    template: WebsiteTemplate
    reason: string
  }[]
}

// Main scanner types
export interface ScanOptions {
  url: string
  tenantId: string
  timeout?: number
  downloadLogo?: boolean
}

export interface ExtractedDesign {
  colors: {
    primary: string | null
    accent: string | null
    confidence: number
  }
  typography: {
    headingFont: string | null
    bodyFont: string | null
    matchedPreset: TypographyPreset | null
    detectedFonts: string[]
    confidence: number
  }
  logo: {
    sourceUrl: string
    downloadedMediaId: string | null
  } | null
  navigation: {
    items: NavItem[]
    structure: NavStructure
    confidence: number
  }
  sections: DetectedSection[]
  templateMatch: TemplateRecommendation
  limitations: string[]
}

export interface ScanResult {
  success: boolean
  extractedDesign: ExtractedDesign
  errors: string[]
}

// Error types
export enum ScanErrorCode {
  FETCH_FAILED = 'FETCH_FAILED',
  TIMEOUT = 'TIMEOUT',
  BLOCKED = 'BLOCKED',
  INVALID_HTML = 'INVALID_HTML',
  NO_CONTENT = 'NO_CONTENT',
  NO_COLORS_FOUND = 'NO_COLORS_FOUND',
  NO_FONTS_FOUND = 'NO_FONTS_FOUND',
  LOGO_DOWNLOAD_FAILED = 'LOGO_DOWNLOAD_FAILED',
}

export const ERROR_MESSAGES: Record<ScanErrorCode, string> = {
  [ScanErrorCode.FETCH_FAILED]: "We couldn't access this website. Please check the URL and try again.",
  [ScanErrorCode.TIMEOUT]: 'The website took too long to respond. Try again or start fresh.',
  [ScanErrorCode.BLOCKED]: 'This website blocks automated access. You\'ll need to start fresh.',
  [ScanErrorCode.INVALID_HTML]: "This doesn't appear to be a valid website. Check the URL.",
  [ScanErrorCode.NO_CONTENT]: 'The website returned an empty page.',
  [ScanErrorCode.NO_COLORS_FOUND]: "We couldn't detect brand colors. Default colors will be used.",
  [ScanErrorCode.NO_FONTS_FOUND]: 'We couldn\'t detect fonts. Using Modern typography preset.',
  [ScanErrorCode.LOGO_DOWNLOAD_FAILED]: "Found a logo but couldn't download it. You can upload one later.",
}
