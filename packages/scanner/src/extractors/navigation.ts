import type { CheerioAPI } from 'cheerio'
import type { Element } from 'domhandler'
import { resolveUrl } from '../fetcher'
import type {
  NavItem,
  NavigationExtractionResult,
  NavStructure,
} from '../types'

/**
 * Extracts navigation from HTML
 */
export function extractNavigation(
  $: CheerioAPI,
  baseUrl: string,
): NavigationExtractionResult {
  const items: NavItem[] = []
  let structure: NavStructure = 'simple'
  let confidence = 0

  // Try header/nav selectors in priority order
  const navSelectors = [
    'header nav',
    'nav[role="navigation"]',
    'nav',
    '[class*="navbar"]',
    '[class*="nav-menu"]',
    'header [class*="menu"]',
  ]

  let navElement: ReturnType<CheerioAPI> | null = null

  for (const selector of navSelectors) {
    const found = $(selector).first()
    if (found.length > 0) {
      navElement = found
      break
    }
  }

  if (!navElement || navElement.length === 0) {
    return {
      items: [],
      structure: 'unknown',
      confidence: 0,
    }
  }

  // Check for mega menu indicators
  const hasMegaMenu = detectMegaMenu($, navElement)
  if (hasMegaMenu) {
    structure = 'mega-menu'
  }

  // Extract nav links
  navElement.find('a').each((_: number, el: Element) => {
    const $link = $(el)
    const href = $link.attr('href')
    const label = $link.text().trim()

    // Skip empty links, anchors, or non-navigation items
    if (!href || !label) return
    if (href === '#' || href.startsWith('javascript:')) return
    if (label.length > 50) return // Likely not a nav item

    // Skip social/utility links
    const lowerLabel = label.toLowerCase()
    if (isUtilityLink(lowerLabel, href)) return

    // Check for dropdown/submenu
    const hasSubmenu =
      $link.siblings('ul, div[class*="dropdown"], div[class*="submenu"]')
        .length > 0 ||
      $link.parent().find('> ul, > div[class*="dropdown"]').length > 0

    const absoluteHref = resolveUrl(href, baseUrl)

    items.push({
      label,
      href: absoluteHref,
      hasSubmenu,
    })
  })

  // Deduplicate items by href
  const uniqueItems = deduplicateItems(items)

  // Calculate confidence
  if (uniqueItems.length > 0) {
    confidence = 0.7
    if (uniqueItems.length >= 3 && uniqueItems.length <= 10) {
      confidence = 0.85 // Reasonable nav size
    }
    if (structure === 'mega-menu') {
      confidence = Math.min(confidence + 0.1, 0.95)
    }
  }

  return {
    items: uniqueItems.slice(0, 12), // Cap at 12 items
    structure,
    confidence,
  }
}

/**
 * Detects if navigation has mega-menu structure
 */
function detectMegaMenu(
  $: CheerioAPI,
  navElement: ReturnType<CheerioAPI>,
): boolean {
  // Check for common mega menu indicators
  const megaMenuIndicators = [
    '[class*="mega"]',
    '[class*="dropdown-menu"][class*="multi"]',
    'li:has(> ul > li > ul)', // Nested lists
    '[class*="submenu"]:has([class*="column"])',
  ]

  for (const indicator of megaMenuIndicators) {
    if (navElement.find(indicator).length > 0) {
      return true
    }
  }

  // Check if any dropdown has multiple columns or many items
  const dropdowns = navElement.find('[class*="dropdown"], [class*="submenu"]')
  let hasComplexDropdown = false

  dropdowns.each((_: number, el: Element) => {
    const $dropdown = $(el)
    const linkCount = $dropdown.find('a').length
    const hasColumns =
      $dropdown.find('[class*="column"], [class*="col-"]').length > 0

    if (linkCount > 8 || hasColumns) {
      hasComplexDropdown = true
      return false // Break
    }
  })

  return hasComplexDropdown
}

/**
 * Checks if link is a utility/social link (not main navigation)
 */
function isUtilityLink(label: string, href: string): boolean {
  const utilityPatterns = [
    'cart',
    'login',
    'sign in',
    'sign up',
    'register',
    'account',
    'search',
    'facebook',
    'instagram',
    'twitter',
    'linkedin',
    'youtube',
    'pinterest',
    'tiktok',
    'whatsapp',
    'email',
    'phone',
    'tel:',
    'mailto:',
    'privacy',
    'terms',
    'cookie',
    'sitemap',
  ]

  const lowerHref = href.toLowerCase()

  for (const pattern of utilityPatterns) {
    if (label.includes(pattern) || lowerHref.includes(pattern)) {
      return true
    }
  }

  return false
}

/**
 * Deduplicates nav items by href
 */
function deduplicateItems(items: NavItem[]): NavItem[] {
  const seen = new Set<string>()
  const unique: NavItem[] = []

  for (const item of items) {
    // Normalize URL for comparison
    const normalizedHref = item.href.replace(/\/$/, '').toLowerCase()
    if (!seen.has(normalizedHref)) {
      seen.add(normalizedHref)
      unique.push(item)
    }
  }

  return unique
}
