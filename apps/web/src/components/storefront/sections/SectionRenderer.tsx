'use client'

import type {
  BlogPost,
  Collection,
  PageSection,
  PageSectionSettings,
  PieceWithMedia,
  Tenant,
} from '@madebuy/shared'
import { AboutSection } from './AboutSection'
import { BlogPreview } from './BlogPreview'
import { CollectionsShowcase } from './CollectionsShowcase'
import { ContactSection } from './ContactSection'
import { CTASection } from './CTASection'
import { CustomOrderCTA } from './CustomOrderCTA'
import { FAQSection } from './FAQSection'
import { FeatureCards } from './FeatureCards'
import { GalleryMasonry } from './GalleryMasonry'
import { HeroSimple } from './HeroSimple'
// Section component imports
import { HeroSlider } from './HeroSlider'
import { NewsletterSignup } from './NewsletterSignup'
import { ProductFeatured } from './ProductFeatured'
import { ProductGrid } from './ProductGrid'
import { ReviewsSection } from './ReviewsSection'
import { Spacer } from './Spacer'
import { Testimonials } from './Testimonials'
import { TextImage } from './TextImage'

// Section component props interface
export interface SectionProps {
  settings: PageSectionSettings
  tenant: Tenant
  tenantSlug: string
  pieces?: PieceWithMedia[]
  collections?: Collection[]
  blogPosts?: BlogPost[]
}

// Section component map
const SECTION_COMPONENTS: Record<string, React.ComponentType<SectionProps>> = {
  'hero-slider': HeroSlider,
  'hero-simple': HeroSimple,
  'feature-cards': FeatureCards,
  'product-grid': ProductGrid,
  'product-featured': ProductFeatured,
  collections: CollectionsShowcase,
  'blog-preview': BlogPreview,
  testimonials: Testimonials,
  cta: CTASection,
  'text-image': TextImage,
  gallery: GalleryMasonry,
  faq: FAQSection,
  about: AboutSection,
  contact: ContactSection,
  'custom-order': CustomOrderCTA,
  newsletter: NewsletterSignup,
  spacer: Spacer,
  reviews: ReviewsSection,
}

// Padding size map
const PADDING_MAP = {
  none: '',
  small: 'py-8',
  medium: 'py-12 md:py-16',
  large: 'py-16 md:py-24',
}

interface SectionRendererProps {
  section: PageSection
  tenant: Tenant
  tenantSlug: string
  pieces?: PieceWithMedia[]
  collections?: Collection[]
  blogPosts?: BlogPost[]
}

export function SectionRenderer({
  section,
  tenant,
  tenantSlug,
  pieces,
  collections,
  blogPosts,
}: SectionRendererProps) {
  // Don't render disabled sections
  if (!section.enabled) {
    return null
  }

  const Component = SECTION_COMPONENTS[section.type]

  if (!Component) {
    // Log warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Unknown section type: ${section.type}`)
    }
    return null
  }

  const { settings } = section
  const paddingTop = settings.paddingTop
    ? PADDING_MAP[settings.paddingTop]
    : PADDING_MAP.medium
  const paddingBottom = settings.paddingBottom
    ? PADDING_MAP[settings.paddingBottom]
    : PADDING_MAP.medium

  const classes = [
    'relative',
    !settings.fullWidth && 'w-full',
    paddingTop,
    paddingBottom,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      id={section.id}
      className={classes}
      style={{
        backgroundColor: settings.backgroundColor || undefined,
      }}
    >
      <Component
        settings={settings}
        tenant={tenant}
        tenantSlug={tenantSlug}
        pieces={pieces}
        collections={collections}
        blogPosts={blogPosts}
      />
    </section>
  )
}

// Export for use in pages
export function SectionList({
  sections,
  tenant,
  tenantSlug,
  pieces,
  collections,
  blogPosts,
}: {
  sections: PageSection[]
  tenant: Tenant
  tenantSlug: string
  pieces?: PieceWithMedia[]
  collections?: Collection[]
  blogPosts?: BlogPost[]
}) {
  // Sort sections by order and filter enabled ones
  const sortedSections = [...sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)

  return (
    <>
      {sortedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          tenant={tenant}
          tenantSlug={tenantSlug}
          pieces={pieces}
          collections={collections}
          blogPosts={blogPosts}
        />
      ))}
    </>
  )
}
