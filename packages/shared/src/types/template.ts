/**
 * Website Template System Types
 *
 * Multi-page, section-driven website builder system.
 * Each tenant can have multiple pages, each with its own sections.
 */

// ============================================
// Template Types
// ============================================

export type WebsiteTemplate =
  | 'classic-store'
  | 'landing-page'
  | 'portfolio'
  | 'magazine'

export interface TemplateDefinition {
  id: WebsiteTemplate
  name: string
  description: string
  thumbnail: string
  defaultPages: WebsitePage[]
  features: string[]
  bestFor: string
}

// ============================================
// Page Types (Multi-Page Support)
// ============================================

export type PageType =
  | 'home' // Homepage (required, always exists)
  | 'shop' // Product listing page
  | 'about' // About page
  | 'contact' // Contact page
  | 'blog' // Blog listing page
  | 'gallery' // Gallery/portfolio page
  | 'faq' // FAQ page
  | 'custom' // Custom page (user-defined)

export interface WebsitePage {
  id: string
  slug: string // URL path (e.g., '', 'about', 'contact') - empty for home
  title: string // Page title
  type: PageType

  // Page content
  sections: PageSection[]

  // Navigation settings
  showInNavigation: boolean
  navigationOrder: number
  navigationLabel?: string // Override title in nav

  // Page settings
  enabled: boolean

  // SEO
  seo?: {
    title?: string // Override page title for SEO
    description?: string
    ogImage?: string
  }
}

// Standard page slugs (used for routing)
export const STANDARD_PAGE_SLUGS: Record<PageType, string> = {
  home: '',
  shop: 'shop',
  about: 'about',
  contact: 'contact',
  blog: 'blog',
  gallery: 'gallery',
  faq: 'faq',
  custom: '', // Custom pages have user-defined slugs
}

// ============================================
// Section Types
// ============================================

export type PageSectionType =
  // Hero variants
  | 'hero-slider' // Full-height hero with image carousel
  | 'hero-simple' // Simple hero with text/image
  // Product/shop sections
  | 'product-grid' // Product cards grid (configurable columns)
  | 'product-featured' // Large featured product showcase
  | 'collections' // Collection showcase
  // Content sections
  | 'feature-cards' // 3-column feature grid
  | 'blog-preview' // Blog post cards
  | 'testimonials' // Customer reviews
  | 'cta' // Call-to-action block
  | 'text-image' // Two-column text + image
  | 'gallery' // Masonry image gallery
  | 'faq' // FAQ accordion
  | 'about' // About section
  | 'contact' // Contact form/info
  | 'custom-order' // Custom order CTA
  | 'newsletter' // Email signup
  | 'spacer' // Visual spacing
  | 'reviews' // Customer reviews aggregated

export interface PageSection {
  id: string
  type: PageSectionType
  order: number
  enabled: boolean
  settings: PageSectionSettings
}

// ============================================
// Section Settings (Base + Type-Specific)
// ============================================

export interface PageSectionSettings {
  // Common settings for all sections
  title?: string
  subtitle?: string
  backgroundColor?: string
  paddingTop?: 'none' | 'small' | 'medium' | 'large'
  paddingBottom?: 'none' | 'small' | 'medium' | 'large'
  fullWidth?: boolean

  // Content completion tracking
  isContentComplete?: boolean

  // Hero content (for Content tab editing)
  headline?: string
  subheadline?: string
  buttonText?: string
  buttonUrl?: string
  backgroundImageUrl?: string
  backgroundMediaId?: string

  // About content
  heading?: string
  storyText?: string
  photoUrl?: string
  photoMediaId?: string

  // Newsletter/CTA content
  description?: string

  // Hero settings
  slides?: HeroSlide[]
  height?: 'small' | 'medium' | 'large' | 'full'
  overlayOpacity?: number
  overlayColor?: string
  ctaButton?: { text: string; url: string }

  // Product grid settings
  columns?: 2 | 3 | 4 | 5
  limit?: number
  showCategories?: boolean
  filterByCategory?: string
  showPrices?: boolean

  // Feature cards settings
  features?: FeatureItem[]
  style?: 'icons' | 'images' | 'minimal'

  // Blog preview settings
  postLimit?: number
  showExcerpt?: boolean
  showDate?: boolean
  layout?: 'grid' | 'list' | 'featured'

  // Testimonials settings
  testimonials?: TestimonialItem[]
  displayStyle?: 'cards' | 'carousel' | 'quotes'

  // CTA settings
  ctaText?: string
  ctaButtonText?: string
  ctaUrl?: string
  ctaStyle?: 'simple' | 'banner' | 'card'

  // Text-image settings
  image?: string
  imageMediaId?: string
  imagePosition?: 'left' | 'right'
  content?: string

  // Gallery settings
  images?: string[]
  imageMediaIds?: string[]
  galleryColumns?: 2 | 3 | 4
  galleryStyle?: 'masonry' | 'grid' | 'carousel'

  // FAQ settings
  faqs?: FAQItem[]
  faqStyle?: 'accordion' | 'list'

  // About settings
  aboutImage?: string
  aboutImageMediaId?: string
  aboutContent?: string
  showSocialLinks?: boolean

  // Contact settings
  showContactForm?: boolean
  showMap?: boolean
  showEmail?: boolean
  showPhone?: boolean

  // Custom order settings
  customOrderTitle?: string
  customOrderDescription?: string
  customOrderButtonText?: string
  customOrderEmail?: string

  // Newsletter settings
  newsletterTitle?: string
  newsletterDescription?: string
  newsletterButtonText?: string

  // Spacer settings
  spacerHeight?: 'small' | 'medium' | 'large'

  // Reviews section settings
  reviewsShowRatingBreakdown?: boolean
  reviewsLimit?: number // default 6
  reviewsLayout?: 'grid' | 'list'
}

// ============================================
// Section Content Items
// ============================================

export interface HeroSlide {
  id: string
  mediaId?: string
  imageUrl?: string
  title?: string
  subtitle?: string
  ctaText?: string
  ctaUrl?: string
}

export interface FeatureItem {
  id: string
  icon?: string // Emoji or icon name
  imageMediaId?: string
  title: string
  description: string
}

export interface TestimonialItem {
  id: string
  name: string
  role?: string
  company?: string
  avatarMediaId?: string
  content: string
  rating?: number // 1-5
}

export interface FAQItem {
  id: string
  question: string
  answer: string
}

// ============================================
// Header & Footer Configuration
// ============================================

export interface HeaderConfig {
  style?: 'default' | 'standard' | 'centered' | 'minimal' | 'transparent'
  showLogo?: boolean
  showBusinessName?: boolean
  showSocialLinks?: boolean
  showSocialIcons?: boolean // Alias for showSocialLinks
  showCart?: boolean
  navLinks?: NavLink[]
  sticky?: boolean
  transparent?: boolean
  backgroundColor?: string
}

export interface FooterConfig {
  style?: 'default' | 'standard' | 'minimal' | 'expanded'
  showLogo?: boolean
  showTagline?: boolean
  showSocialLinks?: boolean
  showContactInfo?: boolean
  showPaymentMethods?: boolean
  showPoweredBy?: boolean
  columns?: FooterColumn[]
  copyrightText?: string
  backgroundColor?: string
}

export interface NavLink {
  id: string
  label: string
  url: string
  openInNewTab?: boolean
}

export interface FooterColumn {
  id: string
  title: string
  links: NavLink[]
}

// ============================================
// Template Defaults (Multi-Page)
// ============================================

export const TEMPLATE_DEFINITIONS: Record<
  WebsiteTemplate,
  Omit<TemplateDefinition, 'thumbnail'>
> = {
  'classic-store': {
    id: 'classic-store',
    name: 'Classic Store',
    description:
      'Full e-commerce website with home, shop, about, and contact pages',
    features: [
      'Home with hero',
      'Shop page',
      'About page',
      'Contact page',
      'Blog',
    ],
    bestFor: 'Full product catalogs',
    defaultPages: [
      {
        id: 'home',
        slug: '',
        title: 'Home',
        type: 'home',
        showInNavigation: true,
        navigationOrder: 1,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'medium' },
          },
          {
            id: 'features',
            type: 'feature-cards',
            order: 2,
            enabled: true,
            settings: {},
          },
          {
            id: 'products',
            type: 'product-grid',
            order: 3,
            enabled: true,
            settings: { columns: 4, limit: 8, title: 'Featured Products' },
          },
          {
            id: 'collections',
            type: 'collections',
            order: 4,
            enabled: true,
            settings: { title: 'Shop by Collection' },
          },
          {
            id: 'testimonials',
            type: 'testimonials',
            order: 5,
            enabled: true,
            settings: {},
          },
          {
            id: 'newsletter',
            type: 'newsletter',
            order: 6,
            enabled: true,
            settings: {},
          },
        ],
      },
      {
        id: 'shop',
        slug: 'shop',
        title: 'Shop',
        type: 'shop',
        showInNavigation: true,
        navigationOrder: 2,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'small', title: 'Shop All Products' },
          },
          {
            id: 'products',
            type: 'product-grid',
            order: 2,
            enabled: true,
            settings: { columns: 4, showCategories: true, showPrices: true },
          },
        ],
      },
      {
        id: 'about',
        slug: 'about',
        title: 'About',
        type: 'about',
        showInNavigation: true,
        navigationOrder: 3,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'small', title: 'About Us' },
          },
          {
            id: 'about',
            type: 'about',
            order: 2,
            enabled: true,
            settings: { showSocialLinks: true },
          },
          {
            id: 'text-image',
            type: 'text-image',
            order: 3,
            enabled: true,
            settings: { imagePosition: 'right', title: 'Our Story' },
          },
        ],
      },
      {
        id: 'contact',
        slug: 'contact',
        title: 'Contact',
        type: 'contact',
        showInNavigation: true,
        navigationOrder: 4,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'small', title: 'Get in Touch' },
          },
          {
            id: 'contact',
            type: 'contact',
            order: 2,
            enabled: true,
            settings: {
              showContactForm: true,
              showEmail: true,
              showPhone: true,
            },
          },
        ],
      },
      {
        id: 'blog',
        slug: 'blog',
        title: 'Blog',
        type: 'blog',
        showInNavigation: true,
        navigationOrder: 5,
        enabled: false, // Disabled by default, user enables if they want blog
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'small', title: 'Blog' },
          },
          {
            id: 'blog',
            type: 'blog-preview',
            order: 2,
            enabled: true,
            settings: {
              postLimit: 12,
              layout: 'grid',
              showExcerpt: true,
              showDate: true,
            },
          },
        ],
      },
    ],
  },
  'landing-page': {
    id: 'landing-page',
    name: 'Landing Page',
    description:
      'Conversion-focused single page with optional shop and contact pages',
    features: [
      'Full-height hero',
      'Feature cards',
      'Testimonials',
      'CTA sections',
      'FAQ',
    ],
    bestFor: 'Services, bookings, single products',
    defaultPages: [
      {
        id: 'home',
        slug: '',
        title: 'Home',
        type: 'home',
        showInNavigation: true,
        navigationOrder: 1,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-slider',
            order: 1,
            enabled: true,
            settings: { height: 'full' },
          },
          {
            id: 'features',
            type: 'feature-cards',
            order: 2,
            enabled: true,
            settings: {},
          },
          {
            id: 'text-image',
            type: 'text-image',
            order: 3,
            enabled: true,
            settings: { imagePosition: 'right' },
          },
          {
            id: 'testimonials',
            type: 'testimonials',
            order: 4,
            enabled: true,
            settings: {},
          },
          {
            id: 'cta',
            type: 'cta',
            order: 5,
            enabled: true,
            settings: { ctaStyle: 'banner' },
          },
          { id: 'faq', type: 'faq', order: 6, enabled: true, settings: {} },
          {
            id: 'newsletter',
            type: 'newsletter',
            order: 7,
            enabled: true,
            settings: {},
          },
        ],
      },
      {
        id: 'shop',
        slug: 'shop',
        title: 'Shop',
        type: 'shop',
        showInNavigation: true,
        navigationOrder: 2,
        enabled: true,
        sections: [
          {
            id: 'products',
            type: 'product-grid',
            order: 1,
            enabled: true,
            settings: { columns: 3, showPrices: true },
          },
        ],
      },
      {
        id: 'contact',
        slug: 'contact',
        title: 'Contact',
        type: 'contact',
        showInNavigation: true,
        navigationOrder: 3,
        enabled: true,
        sections: [
          {
            id: 'contact',
            type: 'contact',
            order: 1,
            enabled: true,
            settings: { showContactForm: true },
          },
        ],
      },
    ],
  },
  portfolio: {
    id: 'portfolio',
    name: 'Portfolio / Gallery',
    description:
      'Visual-first website for artists with gallery, about, and custom order pages',
    features: [
      'Masonry gallery',
      'Featured work',
      'Custom orders',
      'Contact form',
    ],
    bestFor: 'Artists, photographers, custom work',
    defaultPages: [
      {
        id: 'home',
        slug: '',
        title: 'Home',
        type: 'home',
        showInNavigation: true,
        navigationOrder: 1,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'large' },
          },
          {
            id: 'gallery',
            type: 'gallery',
            order: 2,
            enabled: true,
            settings: {
              galleryStyle: 'masonry',
              galleryColumns: 3,
              title: 'Recent Work',
            },
          },
          {
            id: 'cta',
            type: 'cta',
            order: 3,
            enabled: true,
            settings: {
              ctaStyle: 'card',
              ctaText: 'Interested in a custom piece?',
            },
          },
        ],
      },
      {
        id: 'gallery',
        slug: 'gallery',
        title: 'Gallery',
        type: 'gallery',
        showInNavigation: true,
        navigationOrder: 2,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'small', title: 'Gallery' },
          },
          {
            id: 'gallery',
            type: 'gallery',
            order: 2,
            enabled: true,
            settings: { galleryStyle: 'masonry', galleryColumns: 4 },
          },
        ],
      },
      {
        id: 'shop',
        slug: 'shop',
        title: 'Shop',
        type: 'shop',
        showInNavigation: true,
        navigationOrder: 3,
        enabled: true,
        sections: [
          {
            id: 'products',
            type: 'product-grid',
            order: 1,
            enabled: true,
            settings: { columns: 3, showPrices: true },
          },
        ],
      },
      {
        id: 'about',
        slug: 'about',
        title: 'About',
        type: 'about',
        showInNavigation: true,
        navigationOrder: 4,
        enabled: true,
        sections: [
          {
            id: 'about',
            type: 'about',
            order: 1,
            enabled: true,
            settings: { showSocialLinks: true },
          },
          {
            id: 'custom-order',
            type: 'custom-order',
            order: 2,
            enabled: true,
            settings: {},
          },
        ],
      },
      {
        id: 'contact',
        slug: 'contact',
        title: 'Contact',
        type: 'contact',
        showInNavigation: true,
        navigationOrder: 5,
        enabled: true,
        sections: [
          {
            id: 'contact',
            type: 'contact',
            order: 1,
            enabled: true,
            settings: { showContactForm: true, showEmail: true },
          },
        ],
      },
    ],
  },
  magazine: {
    id: 'magazine',
    name: 'Magazine / Editorial',
    description:
      'Blog-forward website with featured articles and editorial style',
    features: [
      'Featured articles',
      'Editorial layout',
      'Collections',
      'Newsletter',
    ],
    bestFor: 'Content creators, storytellers',
    defaultPages: [
      {
        id: 'home',
        slug: '',
        title: 'Home',
        type: 'home',
        showInNavigation: true,
        navigationOrder: 1,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'medium' },
          },
          {
            id: 'blog',
            type: 'blog-preview',
            order: 2,
            enabled: true,
            settings: {
              postLimit: 6,
              layout: 'featured',
              title: 'Latest Stories',
            },
          },
          {
            id: 'collections',
            type: 'collections',
            order: 3,
            enabled: true,
            settings: { title: 'Collections' },
          },
          {
            id: 'newsletter',
            type: 'newsletter',
            order: 4,
            enabled: true,
            settings: {},
          },
        ],
      },
      {
        id: 'blog',
        slug: 'blog',
        title: 'Stories',
        type: 'blog',
        showInNavigation: true,
        navigationOrder: 2,
        enabled: true,
        sections: [
          {
            id: 'hero',
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'small', title: 'Stories' },
          },
          {
            id: 'blog',
            type: 'blog-preview',
            order: 2,
            enabled: true,
            settings: {
              postLimit: 20,
              layout: 'grid',
              showExcerpt: true,
              showDate: true,
            },
          },
        ],
      },
      {
        id: 'shop',
        slug: 'shop',
        title: 'Shop',
        type: 'shop',
        showInNavigation: true,
        navigationOrder: 3,
        enabled: true,
        sections: [
          {
            id: 'products',
            type: 'product-grid',
            order: 1,
            enabled: true,
            settings: { columns: 3, showPrices: true },
          },
        ],
      },
      {
        id: 'about',
        slug: 'about',
        title: 'About',
        type: 'about',
        showInNavigation: true,
        navigationOrder: 4,
        enabled: true,
        sections: [
          {
            id: 'about',
            type: 'about',
            order: 1,
            enabled: true,
            settings: { showSocialLinks: true },
          },
          {
            id: 'text-image',
            type: 'text-image',
            order: 2,
            enabled: true,
            settings: { imagePosition: 'left' },
          },
        ],
      },
      {
        id: 'contact',
        slug: 'contact',
        title: 'Contact',
        type: 'contact',
        showInNavigation: true,
        navigationOrder: 5,
        enabled: true,
        sections: [
          {
            id: 'contact',
            type: 'contact',
            order: 1,
            enabled: true,
            settings: { showContactForm: true },
          },
        ],
      },
    ],
  },
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get default pages for a template
 */
export function getDefaultPages(template: WebsiteTemplate): WebsitePage[] {
  const definition = TEMPLATE_DEFINITIONS[template]
  if (!definition) {
    return TEMPLATE_DEFINITIONS['classic-store'].defaultPages
  }
  // Deep clone to avoid mutations
  return JSON.parse(JSON.stringify(definition.defaultPages))
}

/**
 * Get home page sections for a template (for backward compatibility)
 */
export function getDefaultSections(template: WebsiteTemplate): PageSection[] {
  const pages = getDefaultPages(template)
  const homePage = pages.find((p) => p.type === 'home')
  return homePage?.sections || []
}

/**
 * Generate unique section ID
 */
export function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate unique page ID
 */
export function generatePageId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a new page with default settings based on page type
 */
export function createCustomPage(
  pageType: PageType,
  title: string,
): WebsitePage {
  const slug =
    pageType === 'home'
      ? ''
      : STANDARD_PAGE_SLUGS[pageType] ||
        title.toLowerCase().replace(/\s+/g, '-')

  // Get default sections based on page type
  const defaultSections: PageSection[] = (() => {
    switch (pageType) {
      case 'home':
        return [
          {
            id: generateSectionId(),
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'medium' },
          },
          {
            id: generateSectionId(),
            type: 'product-grid',
            order: 2,
            enabled: true,
            settings: { columns: 3, limit: 8 },
          },
        ]
      case 'shop':
        return [
          {
            id: generateSectionId(),
            type: 'product-grid',
            order: 1,
            enabled: true,
            settings: { columns: 3, showPrices: true },
          },
        ]
      case 'about':
        return [
          {
            id: generateSectionId(),
            type: 'about',
            order: 1,
            enabled: true,
            settings: { showSocialLinks: true },
          },
        ]
      case 'contact':
        return [
          {
            id: generateSectionId(),
            type: 'contact',
            order: 1,
            enabled: true,
            settings: { showContactForm: true },
          },
        ]
      case 'blog':
        return [
          {
            id: generateSectionId(),
            type: 'blog-preview',
            order: 1,
            enabled: true,
            settings: { postLimit: 12, layout: 'grid' },
          },
        ]
      case 'gallery':
        return [
          {
            id: generateSectionId(),
            type: 'gallery',
            order: 1,
            enabled: true,
            settings: { galleryColumns: 3, galleryStyle: 'masonry' },
          },
        ]
      case 'faq':
        return [
          {
            id: generateSectionId(),
            type: 'faq',
            order: 1,
            enabled: true,
            settings: { faqStyle: 'accordion' },
          },
        ]
      default:
        return [
          {
            id: generateSectionId(),
            type: 'hero-simple',
            order: 1,
            enabled: true,
            settings: { height: 'small', title },
          },
          {
            id: generateSectionId(),
            type: 'text-image',
            order: 2,
            enabled: true,
            settings: {},
          },
        ]
    }
  })()

  return {
    id: generatePageId(),
    slug,
    title,
    type: pageType,
    showInNavigation: true,
    navigationOrder: 99,
    enabled: true,
    sections: defaultSections,
  }
}

/**
 * Human-readable labels for section types
 */
export const SECTION_TYPE_LABELS: Record<PageSectionType, string> = {
  'hero-slider': 'Hero Banner (Slider)',
  'hero-simple': 'Hero Banner',
  'product-grid': 'Products Grid',
  'product-featured': 'Featured Product',
  collections: 'Collections',
  'feature-cards': 'Feature Cards',
  'blog-preview': 'Blog Preview',
  testimonials: 'Testimonials',
  cta: 'Call to Action',
  'text-image': 'Text & Image',
  gallery: 'Gallery',
  faq: 'FAQ',
  about: 'About Section',
  contact: 'Contact',
  'custom-order': 'Custom Order CTA',
  newsletter: 'Newsletter Signup',
  spacer: 'Spacer',
  reviews: 'Customer Reviews',
}

/**
 * Validate page slug (URL-safe, unique within pages)
 */
export function validatePageSlug(
  slug: string,
  existingPages: WebsitePage[],
  currentPageId?: string,
): { valid: boolean; error?: string } {
  // Check format
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (slug && !slugRegex.test(slug)) {
    return {
      valid: false,
      error: 'Slug must be lowercase letters, numbers, and hyphens only',
    }
  }

  // Check uniqueness
  const duplicate = existingPages.find(
    (p) => p.slug === slug && p.id !== currentPageId,
  )
  if (duplicate) {
    return { valid: false, error: 'This URL is already used by another page' }
  }

  // Check reserved slugs
  const reserved = [
    'cart',
    'checkout',
    'account',
    'api',
    'admin',
    'login',
    'signup',
    'verify',
  ]
  if (reserved.includes(slug)) {
    return { valid: false, error: 'This URL is reserved and cannot be used' }
  }

  return { valid: true }
}

// ============================================
// Migration Helpers
// ============================================

export const LAYOUT_TO_TEMPLATE_MAP: Record<string, WebsiteTemplate> = {
  grid: 'classic-store',
  minimal: 'landing-page',
  featured: 'portfolio',
  masonry: 'magazine',
}

/**
 * Migrate old single-page sections to new multi-page format
 */
export function migrateSectionsToPages(
  template: WebsiteTemplate,
  oldSections?: PageSection[],
): WebsitePage[] {
  const defaultPages = getDefaultPages(template)

  if (!oldSections || oldSections.length === 0) {
    return defaultPages
  }

  // Put old sections on home page, keep other default pages
  return defaultPages.map((page) => {
    if (page.type === 'home') {
      return { ...page, sections: oldSections }
    }
    return page
  })
}
