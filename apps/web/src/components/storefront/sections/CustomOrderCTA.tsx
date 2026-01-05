import Link from 'next/link'
import Image from 'next/image'
import type { SectionProps } from './SectionRenderer'

export function CustomOrderCTA({ settings, tenant, tenantSlug }: SectionProps) {
  const title = settings.customOrderTitle || settings.title || 'Create Something Unique'
  const description = settings.customOrderDescription || settings.subtitle ||
    "Have a vision for something special? Let's bring it to life together. Custom orders are our specialty."
  const buttonText = settings.customOrderButtonText || 'Start Your Commission'
  const email = settings.customOrderEmail || tenant.email

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 items-center">
        {/* Left Image */}
        <div className="hidden lg:block">
          <div
            className="aspect-[3/4] rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${tenant.primaryColor || '#1a1a1a'}40, ${tenant.accentColor || '#3b82f6'}40)`,
            }}
          />
        </div>

        {/* Center Content */}
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-6">
            {title}
          </h2>

          <blockquote className="text-lg md:text-xl text-gray-600 italic leading-relaxed mb-8">
            &ldquo;{description}&rdquo;
          </blockquote>

          <Link
            href={email ? `mailto:${email}?subject=Custom Order Inquiry` : `/${tenantSlug}/contact`}
            className="inline-flex items-center px-8 py-4 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: tenant.primaryColor || '#3b82f6' }}
          >
            {buttonText} <span className="ml-2">→</span>
          </Link>
        </div>

        {/* Right Image */}
        <div className="hidden lg:block">
          <div
            className="aspect-[3/4] rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(225deg, ${tenant.accentColor || '#3b82f6'}40, ${tenant.primaryColor || '#1a1a1a'}40)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
