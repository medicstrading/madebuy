// Main scanner exports

// Extractor exports
export { extractColors } from './extractors/colors'
export { detectContentType, downloadLogo, extractLogo } from './extractors/logo'
export { extractNavigation } from './extractors/navigation'
export { extractSections } from './extractors/sections'
export {
  detectsProducts,
  recommendTemplate,
} from './extractors/template-matcher'
export { extractTypography } from './extractors/typography'
// Fetcher exports
export {
  fetchHtml,
  fetchStylesheets,
  resolveUrl,
  ScannerError,
} from './fetcher'
export { scanWebsite, WebsiteScanner } from './scanner'

// Type exports
export type {
  ColorCandidate,
  ColorExtractionResult,
  ColorSource,
  DetectedFont,
  DetectedSection,
  ExtractedDesign,
  FontSource,
  LogoExtractionResult,
  LogoSource,
  NavItem,
  NavigationExtractionResult,
  NavStructure,
  ScanOptions,
  ScanResult,
  SectionType,
  TemplateRecommendation,
  TypographyExtractionResult,
} from './types'

export { ERROR_MESSAGES, ScanErrorCode } from './types'
