'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Check, Eye, ExternalLink,
  Image as ImageIcon, Type, Layout, MessageSquare, HelpCircle,
  Mail, Newspaper, Target, Grid
} from 'lucide-react'
import type { WebsitePage, PageSection, PageSectionType } from '@madebuy/shared/src/types/template'
import { SectionContentForm } from './SectionContentForm'

interface PageContentEditorProps {
  page: WebsitePage
  onSectionChange: (section: PageSection) => void
  tenantSlug?: string
}

const SECTION_ICONS: Record<PageSectionType, React.ComponentType<{ className?: string }>> = {
  'hero-slider': Layout,
  'hero-simple': Layout,
  'product-grid': Grid,
  'product-featured': Grid,
  'collections': Grid,
  'feature-cards': Layout,
  'text-image': Type,
  'gallery': ImageIcon,
  'about': Type,
  'blog-preview': Newspaper,
  'testimonials': MessageSquare,
  'cta': Target,
  'newsletter': Mail,
  'faq': HelpCircle,
  'contact': Mail,
  'custom-order': Target,
  'spacer': Layout,
  'reviews': MessageSquare,
}

const SECTION_LABELS: Record<PageSectionType, string> = {
  'hero-slider': 'Hero Banner (Slider)',
  'hero-simple': 'Hero Banner',
  'product-grid': 'Products Grid',
  'product-featured': 'Featured Product',
  'collections': 'Collections',
  'feature-cards': 'Feature Cards',
  'text-image': 'Text & Image',
  'gallery': 'Gallery',
  'about': 'About Section',
  'blog-preview': 'Blog Preview',
  'testimonials': 'Testimonials',
  'cta': 'Call to Action',
  'newsletter': 'Newsletter Signup',
  'faq': 'FAQ',
  'contact': 'Contact',
  'custom-order': 'Custom Order CTA',
  'spacer': 'Spacer',
  'reviews': 'Reviews',
}

export function PageContentEditor({ page, onSectionChange, tenantSlug }: PageContentEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(page.sections.filter(s => s.enabled).slice(0, 1).map(s => s.id))
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const enabledSections = page.sections.filter(s => s.enabled)

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-serif text-gray-900">{page.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {enabledSections.length} sections on this page
          </p>
        </div>
        {tenantSlug && (
          <a
            href={`${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3301'}/${tenantSlug}${page.slug ? `/${page.slug}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Section Cards */}
      <div className="space-y-3">
        {enabledSections.map((section) => {
          const Icon = SECTION_ICONS[section.type] || Layout
          const isExpanded = expandedSections.has(section.id)
          const isComplete = section.settings?.isContentComplete

          return (
            <div
              key={section.id}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? 'border-indigo-200 bg-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                {/* Completion indicator */}
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                </div>

                {/* Icon and label */}
                <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isExpanded ? 'text-indigo-600' : 'text-gray-500'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${isExpanded ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {section.settings?.title || SECTION_LABELS[section.type]}
                  </h3>
                  {!isComplete && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Click to add content
                    </p>
                  )}
                </div>

                {/* Expand/collapse icon */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Section Content Form */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-5">
                    <SectionContentForm
                      section={section}
                      onChange={onSectionChange}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {enabledSections.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Layout className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-700 mb-2">No sections on this page</p>
          <p className="text-sm">Add sections to start building your page content.</p>
        </div>
      )}
    </div>
  )
}
