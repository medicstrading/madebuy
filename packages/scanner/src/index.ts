// Main scanner exports
export { WebsiteScanner, scanWebsite } from './scanner'

// Fetcher exports
export { fetchHtml, fetchStylesheets, ScannerError, resolveUrl } from './fetcher'

// Extractor exports
export { extractColors } from './extractors/colors'
export { extractTypography } from './extractors/typography'
export { extractLogo, downloadLogo, detectContentType } from './extractors/logo'
export { extractNavigation } from './extractors/navigation'
export { extractSections } from './extractors/sections'
export { recommendTemplate, detectsProducts } from './extractors/template-matcher'

// Type exports
export type {
  ScanOptions,
  ScanResult,
  ExtractedDesign,
  ColorCandidate,
  ColorExtractionResult,
  ColorSource,
  DetectedFont,
  TypographyExtractionResult,
  FontSource,
  LogoExtractionResult,
  LogoSource,
  NavItem,
  NavStructure,
  NavigationExtractionResult,
  SectionType,
  DetectedSection,
  TemplateRecommendation,
} from './types'

export { ScanErrorCode, ERROR_MESSAGES } from './types'
