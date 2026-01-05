'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SectionProps } from './SectionRenderer'
import type { FAQItem } from '@madebuy/shared'

// Default FAQs if none provided
const DEFAULT_FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'How long does shipping take?',
    answer: 'We typically ship within 2-3 business days. Delivery times vary by location but usually take 5-10 business days domestically.',
  },
  {
    id: '2',
    question: 'Do you offer returns or exchanges?',
    answer: 'Yes! We offer returns within 30 days of delivery. Items must be in original condition. Please contact us to initiate a return.',
  },
  {
    id: '3',
    question: 'Are your products handmade?',
    answer: 'Yes, all our products are handcrafted with care. Each piece is unique and made with attention to detail.',
  },
]

export function FAQSection({ settings, tenant }: SectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const title = settings.title || 'Frequently Asked Questions'
  const subtitle = settings.subtitle
  const faqs = settings.faqs?.length ? settings.faqs : DEFAULT_FAQS
  const faqStyle = settings.faqStyle || 'accordion'

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="max-w-3xl mx-auto px-6">
      {/* Section header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-lg text-gray-600">
            {subtitle}
          </p>
        )}
      </div>

      {/* FAQs */}
      {faqStyle === 'list' ? (
        <div className="space-y-8">
          {faqs.map((faq) => (
            <div key={faq.id}>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {faq.question}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      ) : (
        // Accordion style
        <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
          {faqs.map((faq, index) => (
            <div key={faq.id}>
              <button
                onClick={() => toggleFaq(index)}
                className="w-full py-5 flex items-center justify-between text-left"
              >
                <span className="text-lg font-medium text-gray-900">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96 pb-5' : 'max-h-0'
                }`}
              >
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
