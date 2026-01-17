import type { WebsiteTemplate } from '@madebuy/shared'
import type {
  DetectedSection,
  SectionType,
  TemplateRecommendation,
} from '../types'

/**
 * Template scoring criteria
 */
interface TemplateScore {
  template: WebsiteTemplate
  score: number
  reasons: string[]
}

/**
 * Section weights for each template
 */
const TEMPLATE_SECTION_WEIGHTS: Record<
  WebsiteTemplate,
  Partial<Record<SectionType, number>>
> = {
  'classic-store': {
    'product-grid': 3.0,
    hero: 1.5,
    features: 1.0,
    testimonials: 1.5,
    contact: 0.5,
    cta: 1.0,
    faq: 0.5,
  },
  'landing-page': {
    hero: 3.0,
    features: 2.0,
    testimonials: 2.0,
    cta: 2.5,
    about: 1.0,
    contact: 1.5,
    faq: 1.0,
    'product-grid': -0.5, // Slight penalty for e-commerce focus
  },
  portfolio: {
    gallery: 3.0,
    about: 2.0,
    hero: 1.5,
    testimonials: 1.5,
    contact: 2.0,
    features: 0.5, // Services
    'product-grid': 0.5, // Could be artwork for sale
  },
  magazine: {
    hero: 1.0,
    gallery: 1.5,
    about: 1.5,
    features: 1.0,
    testimonials: 0.5,
    faq: 0.5,
    contact: 0.5,
    // Magazine is more content-focused, neutral to sections
  },
}

/**
 * Base scores for templates (default suitability)
 */
const TEMPLATE_BASE_SCORES: Record<WebsiteTemplate, number> = {
  'classic-store': 2.0, // Good default for MadeBuy (e-commerce focused)
  'landing-page': 1.5,
  portfolio: 1.0,
  magazine: 0.5,
}

/**
 * Recommends a MadeBuy template based on detected sections
 */
export function recommendTemplate(
  sections: DetectedSection[],
  hasProducts: boolean = false,
): TemplateRecommendation {
  const scores: TemplateScore[] = []

  for (const template of Object.keys(
    TEMPLATE_SECTION_WEIGHTS,
  ) as WebsiteTemplate[]) {
    const result = scoreTemplate(template, sections, hasProducts)
    scores.push(result)
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  const best = scores[0]
  const secondBest = scores[1]

  // Calculate confidence based on score margin
  let confidence = 0.5
  if (best && secondBest) {
    const margin = best.score - secondBest.score
    if (margin > 3) {
      confidence = 0.9
    } else if (margin > 2) {
      confidence = 0.8
    } else if (margin > 1) {
      confidence = 0.7
    } else if (margin > 0.5) {
      confidence = 0.6
    }
  }

  // Boost confidence if many sections detected
  if (sections.length >= 4) {
    confidence = Math.min(confidence + 0.1, 0.95)
  }

  return {
    recommended: best?.template || 'classic-store',
    confidence,
    reason: best?.reasons.join('; ') || 'Default recommendation for e-commerce',
    alternatives: scores.slice(1, 3).map((s) => ({
      template: s.template,
      reason: s.reasons[0] || 'Alternative option',
    })),
  }
}

/**
 * Scores a template based on detected sections
 */
function scoreTemplate(
  template: WebsiteTemplate,
  sections: DetectedSection[],
  hasProducts: boolean,
): TemplateScore {
  const weights = TEMPLATE_SECTION_WEIGHTS[template]
  let score = TEMPLATE_BASE_SCORES[template]
  const reasons: string[] = []

  // Score based on detected sections
  for (const section of sections) {
    const weight = weights[section.type] || 0
    if (weight !== 0) {
      // Weight by section confidence
      const contribution = weight * section.confidence
      score += contribution

      if (contribution > 0.5) {
        reasons.push(`Has ${section.type} section`)
      }
    }
  }

  // Bonus for product detection
  if (hasProducts) {
    if (template === 'classic-store') {
      score += 2.0
      reasons.push('Product listings detected')
    } else if (template === 'landing-page') {
      score += 0.5
    }
  }

  // Bonus for section count matching template expectations
  const sectionCount = sections.length
  if (template === 'landing-page' && sectionCount >= 4) {
    score += 0.5
    reasons.push('Multiple sections ideal for landing page')
  }
  if (template === 'portfolio' && sections.some((s) => s.type === 'gallery')) {
    score += 1.0
    reasons.push('Gallery section matches portfolio style')
  }

  // Add default reason if no specific reasons
  if (reasons.length === 0) {
    reasons.push(getDefaultReason(template))
  }

  return { template, score, reasons }
}

/**
 * Gets default reason for a template
 */
function getDefaultReason(template: WebsiteTemplate): string {
  switch (template) {
    case 'classic-store':
      return 'Best for product-focused stores'
    case 'landing-page':
      return 'Great for conversion-focused pages'
    case 'portfolio':
      return 'Ideal for showcasing work'
    case 'magazine':
      return 'Good for content-heavy sites'
    default:
      return 'Suitable template option'
  }
}

/**
 * Checks if detected sections suggest products/e-commerce
 */
export function detectsProducts(sections: DetectedSection[]): boolean {
  return sections.some((s) => s.type === 'product-grid' && s.confidence > 0.5)
}
