import Link from 'next/link'
import type { SectionProps } from './SectionRenderer'

export function CTASection({ settings, tenant, tenantSlug }: SectionProps) {
  const title = settings.title || 'Ready to Get Started?'
  const subtitle = settings.subtitle || settings.ctaText
  const buttonText = settings.ctaButtonText || 'Shop Now'
  const buttonUrl = settings.ctaUrl || `/${tenantSlug}/shop`
  const style = settings.ctaStyle || 'banner'

  if (style === 'simple') {
    return (
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-gray-600 mb-8">
            {subtitle}
          </p>
        )}
        <Link
          href={buttonUrl}
          className="inline-flex items-center px-8 py-4 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
        >
          {buttonText} <span className="ml-2">→</span>
        </Link>
      </div>
    )
  }

  if (style === 'card') {
    return (
      <div className="max-w-4xl mx-auto px-6">
        <div
          className="rounded-2xl p-8 md:p-12 text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${tenant.primaryColor || '#1a1a1a'}, ${tenant.accentColor || '#3b82f6'})`,
          }}
        >
          <h2 className="text-3xl md:text-4xl font-serif mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          <Link
            href={buttonUrl}
            className="inline-flex items-center px-8 py-4 rounded-lg font-medium bg-white text-gray-900 transition-all duration-200 hover:scale-105"
          >
            {buttonText} <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    )
  }

  // Banner style (default)
  return (
    <div
      className="w-full py-12 md:py-16"
      style={{
        background: `linear-gradient(135deg, ${tenant.primaryColor || '#1a1a1a'}, ${tenant.accentColor || '#3b82f6'})`,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-serif mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        <Link
          href={buttonUrl}
          className="inline-flex items-center px-8 py-4 rounded-lg font-medium bg-white text-gray-900 transition-all duration-200 hover:scale-105"
        >
          {buttonText} <span className="ml-2">→</span>
        </Link>
      </div>
    </div>
  )
}
