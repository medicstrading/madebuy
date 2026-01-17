import type { TestimonialItem } from '@madebuy/shared'
import { Star } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'

// Default testimonials if none provided
const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: '1',
    name: 'Happy Customer',
    content:
      'Absolutely beautiful craftsmanship! The attention to detail is incredible.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Satisfied Buyer',
    content:
      'Exceeded my expectations. Fast shipping and the quality is outstanding.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Repeat Customer',
    content:
      "I've purchased multiple pieces and they're all stunning. Highly recommend!",
    rating: 5,
  },
]

export function Testimonials({ settings, tenant }: SectionProps) {
  const title = settings.title || 'What Our Customers Say'
  const subtitle = settings.subtitle
  const testimonials = settings.testimonials?.length
    ? settings.testimonials
    : DEFAULT_TESTIMONIALS
  const displayStyle = settings.displayStyle || 'cards'

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Section header */}
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        )}
      </div>

      {/* Testimonials */}
      {displayStyle === 'quotes' ? (
        // Large quote style
        <div className="max-w-3xl mx-auto text-center">
          {testimonials.slice(0, 1).map((testimonial) => (
            <div key={testimonial.id}>
              <blockquote className="text-2xl md:text-3xl font-serif text-gray-900 italic leading-relaxed mb-8">
                &ldquo;{testimonial.content}&rdquo;
              </blockquote>
              <div className="flex items-center justify-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-current"
                    style={{ color: tenant.accentColor || '#f59e0b' }}
                  />
                ))}
              </div>
              <p className="font-medium text-gray-900">{testimonial.name}</p>
              {testimonial.role && (
                <p className="text-gray-500">{testimonial.role}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Cards style
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white rounded-xl p-6 md:p-8 border border-gray-100 shadow-sm"
            >
              {/* Stars */}
              {testimonial.rating && (
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-current"
                      style={{ color: tenant.accentColor || '#f59e0b' }}
                    />
                  ))}
                </div>
              )}

              {/* Quote */}
              <blockquote className="text-gray-700 leading-relaxed mb-6">
                &ldquo;{testimonial.content}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                {testimonial.avatarMediaId ? (
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{
                      backgroundColor: tenant.primaryColor || '#3b82f6',
                    }}
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {testimonial.name}
                  </p>
                  {testimonial.role && (
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
