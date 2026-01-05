/**
 * Section Components for Template-Based Website Builder
 *
 * These modular section components are used by the SectionRenderer
 * to dynamically compose tenant storefronts.
 */

// Main renderer
export { SectionRenderer, SectionList } from './SectionRenderer'
export type { SectionProps } from './SectionRenderer'

// Hero sections
export { HeroSlider } from './HeroSlider'
export { HeroSimple } from './HeroSimple'

// Product sections
export { ProductGrid } from './ProductGrid'
export { ProductFeatured } from './ProductFeatured'
export { CollectionsShowcase } from './CollectionsShowcase'

// Content sections
export { FeatureCards } from './FeatureCards'
export { BlogPreview } from './BlogPreview'
export { Testimonials } from './Testimonials'
export { CTASection } from './CTASection'
export { TextImage } from './TextImage'
export { GalleryMasonry } from './GalleryMasonry'
export { FAQSection } from './FAQSection'
export { AboutSection } from './AboutSection'
export { ContactSection } from './ContactSection'
export { CustomOrderCTA } from './CustomOrderCTA'
export { NewsletterSignup } from './NewsletterSignup'

// Utility sections
export { Spacer } from './Spacer'
