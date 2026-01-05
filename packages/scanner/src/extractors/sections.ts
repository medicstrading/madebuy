import type { CheerioAPI, Cheerio } from 'cheerio'
import type { Element, AnyNode } from 'domhandler'
import type { DetectedSection, SectionType } from '../types'

/**
 * Section detection patterns
 */
interface SectionPattern {
  type: SectionType
  selectors: string[]
  classPatterns: string[]
  contentIndicators: ContentIndicator[]
  minConfidence: number
}

interface ContentIndicator {
  name: string
  check: ($el: ReturnType<CheerioAPI>, $: CheerioAPI) => boolean
  weight: number
}

const SECTION_PATTERNS: SectionPattern[] = [
  {
    type: 'hero',
    selectors: [
      '[class*="hero"]',
      '[class*="banner"]',
      'section:first-of-type',
      '[class*="jumbotron"]',
      '[class*="masthead"]',
    ],
    classPatterns: ['hero', 'banner', 'jumbotron', 'masthead', 'intro', 'landing'],
    contentIndicators: [
      {
        name: 'large-heading',
        check: ($el) => $el.find('h1').length > 0,
        weight: 0.3,
      },
      {
        name: 'cta-button',
        check: ($el) => $el.find('a[class*="btn"], button, a[class*="cta"]').length > 0,
        weight: 0.2,
      },
      {
        name: 'background-image',
        check: ($el) => {
          const style = $el.attr('style') || ''
          return style.includes('background') || $el.find('img').length > 0
        },
        weight: 0.2,
      },
      {
        name: 'first-section',
        check: ($el, $) => $el.is('section:first-of-type, main > *:first-child, body > *:nth-child(-n+3)'),
        weight: 0.1,
      },
    ],
    minConfidence: 0.4,
  },
  {
    type: 'product-grid',
    selectors: [
      '[class*="product"]',
      '[class*="shop"]',
      '[class*="store"]',
      '[class*="catalog"]',
      '[class*="collection"]',
    ],
    classPatterns: ['product', 'shop', 'store', 'catalog', 'collection', 'items', 'goods'],
    contentIndicators: [
      {
        name: 'multiple-images',
        check: ($el) => $el.find('img').length >= 3,
        weight: 0.25,
      },
      {
        name: 'prices',
        check: ($el) => {
          const text = $el.text()
          return /\$[\d,.]+|AUD|USD|€|£/.test(text)
        },
        weight: 0.3,
      },
      {
        name: 'add-to-cart',
        check: ($el) => {
          const text = $el.text().toLowerCase()
          return text.includes('add to cart') || text.includes('buy now') || text.includes('shop now')
        },
        weight: 0.2,
      },
      {
        name: 'grid-layout',
        check: ($el) => $el.find('[class*="grid"], [class*="col-"], [class*="card"]').length >= 2,
        weight: 0.15,
      },
    ],
    minConfidence: 0.5,
  },
  {
    type: 'testimonials',
    selectors: [
      '[class*="testimonial"]',
      '[class*="review"]',
      '[class*="feedback"]',
      'blockquote',
    ],
    classPatterns: ['testimonial', 'review', 'feedback', 'quote', 'customer-say', 'what-people'],
    contentIndicators: [
      {
        name: 'quotes',
        check: ($el) => $el.find('blockquote, q, [class*="quote"]').length > 0,
        weight: 0.3,
      },
      {
        name: 'attribution',
        check: ($el) => $el.find('cite, [class*="author"], [class*="name"]').length > 0,
        weight: 0.2,
      },
      {
        name: 'rating-stars',
        check: ($el) => {
          const html = $el.html() || ''
          return html.includes('star') || html.includes('★') || html.includes('rating')
        },
        weight: 0.2,
      },
      {
        name: 'multiple-items',
        check: ($el) => {
          const items = $el.find('[class*="item"], [class*="card"], blockquote, [class*="testimonial"]')
          return items.length >= 2
        },
        weight: 0.15,
      },
    ],
    minConfidence: 0.4,
  },
  {
    type: 'about',
    selectors: [
      '[class*="about"]',
      '#about',
      '[class*="story"]',
      '[class*="who-we-are"]',
    ],
    classPatterns: ['about', 'story', 'who-we', 'our-story', 'mission', 'values'],
    contentIndicators: [
      {
        name: 'about-heading',
        check: ($el) => {
          const headings = $el.find('h1, h2, h3').text().toLowerCase()
          return headings.includes('about') || headings.includes('story') || headings.includes('who we')
        },
        weight: 0.3,
      },
      {
        name: 'paragraph-text',
        check: ($el) => {
          const paragraphs = $el.find('p')
          return paragraphs.length >= 2
        },
        weight: 0.2,
      },
      {
        name: 'team-photos',
        check: ($el) => {
          const imgs = $el.find('img')
          const hasTeamKeywords = $el.text().toLowerCase().includes('team') ||
                                   $el.find('[class*="team"]').length > 0
          return imgs.length >= 1 && hasTeamKeywords
        },
        weight: 0.15,
      },
    ],
    minConfidence: 0.4,
  },
  {
    type: 'contact',
    selectors: [
      '[class*="contact"]',
      '#contact',
      'form',
      '[class*="get-in-touch"]',
    ],
    classPatterns: ['contact', 'get-in-touch', 'reach-us', 'enquir'],
    contentIndicators: [
      {
        name: 'form',
        check: ($el) => $el.find('form, input, textarea').length > 0,
        weight: 0.3,
      },
      {
        name: 'contact-info',
        check: ($el) => {
          const text = $el.text().toLowerCase()
          return text.includes('email') || text.includes('phone') || text.includes('address')
        },
        weight: 0.25,
      },
      {
        name: 'email-link',
        check: ($el) => $el.find('a[href^="mailto:"]').length > 0,
        weight: 0.2,
      },
      {
        name: 'phone-link',
        check: ($el) => $el.find('a[href^="tel:"]').length > 0,
        weight: 0.15,
      },
    ],
    minConfidence: 0.4,
  },
  {
    type: 'features',
    selectors: [
      '[class*="feature"]',
      '[class*="benefit"]',
      '[class*="service"]',
      '[class*="why-choose"]',
    ],
    classPatterns: ['feature', 'benefit', 'service', 'why-choose', 'why-us', 'offering'],
    contentIndicators: [
      {
        name: 'icons',
        check: ($el) => $el.find('svg, [class*="icon"], i[class]').length >= 2,
        weight: 0.25,
      },
      {
        name: 'grid-items',
        check: ($el) => $el.find('[class*="item"], [class*="card"], [class*="col"]').length >= 3,
        weight: 0.25,
      },
      {
        name: 'headings-per-item',
        check: ($el) => $el.find('h3, h4').length >= 3,
        weight: 0.2,
      },
    ],
    minConfidence: 0.4,
  },
  {
    type: 'gallery',
    selectors: [
      '[class*="gallery"]',
      '[class*="portfolio"]',
      '[class*="showcase"]',
      '[class*="work"]',
    ],
    classPatterns: ['gallery', 'portfolio', 'showcase', 'work', 'projects', 'photos'],
    contentIndicators: [
      {
        name: 'many-images',
        check: ($el) => $el.find('img').length >= 4,
        weight: 0.35,
      },
      {
        name: 'grid-layout',
        check: ($el) => $el.find('[class*="grid"], [class*="masonry"]').length > 0,
        weight: 0.2,
      },
      {
        name: 'lightbox',
        check: ($el) => $el.find('[data-lightbox], [class*="lightbox"], a > img').length >= 2,
        weight: 0.15,
      },
    ],
    minConfidence: 0.45,
  },
  {
    type: 'faq',
    selectors: [
      '[class*="faq"]',
      '[class*="accordion"]',
      '[class*="question"]',
    ],
    classPatterns: ['faq', 'accordion', 'question', 'answer', 'help'],
    contentIndicators: [
      {
        name: 'question-marks',
        check: ($el) => {
          const text = $el.text()
          return (text.match(/\?/g) || []).length >= 3
        },
        weight: 0.3,
      },
      {
        name: 'accordion-structure',
        check: ($el) => $el.find('[class*="accordion"], details, [class*="collapse"]').length >= 2,
        weight: 0.3,
      },
      {
        name: 'toggle-buttons',
        check: ($el) => $el.find('button, [class*="toggle"], [class*="expand"]').length >= 2,
        weight: 0.15,
      },
    ],
    minConfidence: 0.45,
  },
  {
    type: 'cta',
    selectors: [
      '[class*="cta"]',
      '[class*="call-to-action"]',
      '[class*="signup"]',
      '[class*="subscribe"]',
    ],
    classPatterns: ['cta', 'call-to-action', 'signup', 'subscribe', 'newsletter', 'join'],
    contentIndicators: [
      {
        name: 'prominent-button',
        check: ($el) => $el.find('button, a[class*="btn"], input[type="submit"]').length > 0,
        weight: 0.3,
      },
      {
        name: 'email-input',
        check: ($el) => $el.find('input[type="email"]').length > 0,
        weight: 0.25,
      },
      {
        name: 'short-text',
        check: ($el) => {
          const text = $el.text().trim()
          return text.length < 300 && text.length > 10
        },
        weight: 0.1,
      },
    ],
    minConfidence: 0.4,
  },
]

/**
 * Extracts sections from HTML
 */
export function extractSections($: CheerioAPI): DetectedSection[] {
  const detectedSections: DetectedSection[] = []
  const processedElements = new Set<Element>()

  // Find all potential section containers
  const sectionContainers = $('section, [class*="section"], main > div, article, [role="region"]')

  sectionContainers.each((_: number, el: Element) => {
    if (processedElements.has(el)) return

    const $el = $(el)

    // Skip very small sections
    if ($el.text().trim().length < 50) return

    // Try to match against patterns
    for (const pattern of SECTION_PATTERNS) {
      const matchResult = matchSection($, $el, pattern)

      if (matchResult.confidence >= pattern.minConfidence) {
        detectedSections.push({
          type: pattern.type,
          confidence: matchResult.confidence,
          selector: getSelector($el),
          indicators: matchResult.matchedIndicators,
        })
        processedElements.add(el)
        break // Only match one pattern per section
      }
    }
  })

  // Also check for specific selectors that might not be in section containers
  for (const pattern of SECTION_PATTERNS) {
    for (const selector of pattern.selectors) {
      try {
        const elements = $(selector).toArray() as Element[]
        for (const el of elements) {
          if (processedElements.has(el)) continue

          const $el = $(el)
          if ($el.text().trim().length < 50) continue

          const matchResult = matchSection($, $el, pattern)

          if (matchResult.confidence >= pattern.minConfidence) {
            // Check if this is nested within an already detected section
            let isNested = false
            const parents = $el.parents().toArray() as Element[]
            for (const parent of parents) {
              if (processedElements.has(parent)) {
                isNested = true
                break
              }
            }

            if (!isNested) {
              detectedSections.push({
                type: pattern.type,
                confidence: matchResult.confidence,
                selector: getSelector($el),
                indicators: matchResult.matchedIndicators,
              })
              processedElements.add(el)
            }
          }
        }
      } catch {
        // Invalid selector, skip
      }
    }
  }

  // Sort by position in document (approximate via order found)
  // and deduplicate by type (keep highest confidence)
  return deduplicateSections(detectedSections)
}

/**
 * Matches an element against a section pattern
 */
function matchSection(
  $: CheerioAPI,
  $el: ReturnType<CheerioAPI>,
  pattern: SectionPattern
): { confidence: number; matchedIndicators: string[] } {
  let confidence = 0
  const matchedIndicators: string[] = []

  // Check class patterns
  const classes = ($el.attr('class') || '').toLowerCase()
  const id = ($el.attr('id') || '').toLowerCase()

  for (const classPattern of pattern.classPatterns) {
    if (classes.includes(classPattern) || id.includes(classPattern)) {
      confidence += 0.3
      matchedIndicators.push(`class-match:${classPattern}`)
      break
    }
  }

  // Check content indicators
  for (const indicator of pattern.contentIndicators) {
    try {
      if (indicator.check($el, $)) {
        confidence += indicator.weight
        matchedIndicators.push(indicator.name)
      }
    } catch {
      // Indicator check failed, skip
    }
  }

  // Cap confidence at 0.95
  return {
    confidence: Math.min(confidence, 0.95),
    matchedIndicators,
  }
}

/**
 * Gets a CSS selector for an element
 */
function getSelector($el: ReturnType<CheerioAPI>): string {
  const tag = $el.prop('tagName')?.toLowerCase() || 'div'
  const id = $el.attr('id')
  const classes = $el.attr('class')

  if (id) {
    return `#${id}`
  }

  if (classes) {
    const firstClass = classes.split(/\s+/)[0]
    if (firstClass) {
      return `${tag}.${firstClass}`
    }
  }

  return tag
}

/**
 * Deduplicates sections by type, keeping highest confidence
 */
function deduplicateSections(sections: DetectedSection[]): DetectedSection[] {
  const byType = new Map<SectionType, DetectedSection>()

  for (const section of sections) {
    const existing = byType.get(section.type)
    if (!existing || section.confidence > existing.confidence) {
      byType.set(section.type, section)
    }
  }

  return Array.from(byType.values())
}
