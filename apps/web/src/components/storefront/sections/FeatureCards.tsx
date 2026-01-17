import type { FeatureItem } from '@madebuy/shared'
import type { SectionProps } from './SectionRenderer'

// Default features if none provided
const DEFAULT_FEATURES: FeatureItem[] = [
  {
    id: '1',
    icon: '✨',
    title: 'Handcrafted With Care',
    description:
      'Each piece is meticulously crafted by hand, ensuring unique character and exceptional quality.',
  },
  {
    id: '2',
    icon: '🎨',
    title: 'One-of-a-Kind',
    description:
      'No mass production here. Every piece is an original creation that reflects individuality.',
  },
  {
    id: '3',
    icon: '💝',
    title: 'Made With Love',
    description:
      'We pour our heart and soul into every creation, making each piece truly special.',
  },
]

export function FeatureCards({ settings, tenant }: SectionProps) {
  const title = settings.title
  const subtitle = settings.subtitle
  const features = settings.features?.length
    ? settings.features
    : DEFAULT_FEATURES
  const _style = settings.style || 'icons'

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Section header */}
      {(title || subtitle) && (
        <div className="text-center mb-12 md:mb-16">
          {title && (
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Features grid */}
      <div className="grid md:grid-cols-3 gap-8 md:gap-12">
        {features.map((feature, index) => (
          <div key={feature.id || index} className="text-center group">
            {/* Icon/Emoji */}
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl transform group-hover:scale-110 transition-transform duration-300"
              style={{
                backgroundColor: `${tenant.accentColor || '#f59e0b'}20`,
                color: tenant.accentColor || '#f59e0b',
              }}
            >
              {feature.icon || '✨'}
            </div>

            {/* Title */}
            <h3 className="text-xl md:text-2xl font-serif text-gray-900 mb-3">
              {feature.title}
            </h3>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
