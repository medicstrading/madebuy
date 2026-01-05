import type { WebsiteTemplate } from './template'
import type { TypographyPreset } from './tenant'

/**
 * Navigation item extracted from a website
 */
export interface NavItem {
  label: string
  href: string
  hasSubmenu?: boolean
}

export type NavStructure = 'simple' | 'mega-menu' | 'unknown'

/**
 * Section types that can be detected
 */
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

/**
 * A detected section from the website
 */
export interface DetectedSection {
  type: SectionType
  confidence: number
  selector: string
  indicators: string[]
}

/**
 * Template recommendation based on detected sections
 */
export interface TemplateRecommendation {
  recommended: WebsiteTemplate
  confidence: number
  reason: string
  alternatives: {
    template: WebsiteTemplate
    reason: string
  }[]
}

/**
 * Design extracted from a scanned website
 */
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

/**
 * State of the design import process
 */
export interface DesignImportState {
  sourceUrl: string | null
  scannedAt: Date | null
  extractedDesign: ExtractedDesign | null
  importStatus: DesignImportStatus
}

export type DesignImportStatus = 'not_started' | 'scanning' | 'preview' | 'accepted' | 'declined'

/**
 * Domain onboarding state (including design import)
 */
export interface DomainOnboardingState {
  // Domain setup
  status: DomainOnboardingStatus
  domain?: string
  domainSource?: 'cloudflare_purchase' | 'existing_cloudflare' | 'external_transfer'
  cloudflareAccountConnected?: boolean
  cloudflareZoneId?: string
  dnsVerified?: boolean
  sslStatus?: 'pending' | 'active' | 'error'
  pendingDnsRecords?: DnsRecord[]
  verificationToken?: string

  // Design import
  designImport?: DesignImportState
}

export type DomainOnboardingStatus = 'not_started' | 'domain_setup' | 'design_choice' | 'importing' | 'complete'

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT'
  name: string
  value: string
  verified: boolean
}

/**
 * Preview configuration for showing extracted design before accepting
 */
export interface PreviewConfig {
  id: string
  tenantId: string
  extractedDesign: ExtractedDesign
  sourceUrl: string
  createdAt: Date
  expiresAt: Date
}
