'use client'

import { useState } from 'react'
import {
  X,
  ShoppingBag,
  Info,
  Mail,
  BookOpen,
  Image,
  HelpCircle,
  FileText,
  Check,
} from 'lucide-react'
import type { PageType, WebsitePage } from '@madebuy/shared'
import { generatePageId, generateSectionId, validatePageSlug } from '@madebuy/shared'

interface AddPageModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPage: (page: WebsitePage) => void
  existingPages: WebsitePage[]
}

interface PageTemplate {
  type: PageType
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  defaultSlug: string
  defaultSections: WebsitePage['sections']
}

const PAGE_TEMPLATES: PageTemplate[] = [
  {
    type: 'shop',
    name: 'Shop Page',
    description: 'Display all your products in a grid',
    icon: ShoppingBag,
    defaultSlug: 'shop',
    defaultSections: [
      { id: '', type: 'hero-simple', order: 1, enabled: true, settings: { height: 'small', title: 'Shop' } },
      { id: '', type: 'product-grid', order: 2, enabled: true, settings: { columns: 4, showCategories: true, showPrices: true } },
    ],
  },
  {
    type: 'about',
    name: 'About Page',
    description: 'Tell your story and connect with customers',
    icon: Info,
    defaultSlug: 'about',
    defaultSections: [
      { id: '', type: 'hero-simple', order: 1, enabled: true, settings: { height: 'small', title: 'About' } },
      { id: '', type: 'about', order: 2, enabled: true, settings: { showSocialLinks: true } },
      { id: '', type: 'text-image', order: 3, enabled: true, settings: { imagePosition: 'right' } },
    ],
  },
  {
    type: 'contact',
    name: 'Contact Page',
    description: 'Let customers get in touch with you',
    icon: Mail,
    defaultSlug: 'contact',
    defaultSections: [
      { id: '', type: 'hero-simple', order: 1, enabled: true, settings: { height: 'small', title: 'Contact' } },
      { id: '', type: 'contact', order: 2, enabled: true, settings: { showContactForm: true, showEmail: true, showPhone: true } },
    ],
  },
  {
    type: 'blog',
    name: 'Blog Page',
    description: 'Share articles and updates',
    icon: BookOpen,
    defaultSlug: 'blog',
    defaultSections: [
      { id: '', type: 'hero-simple', order: 1, enabled: true, settings: { height: 'small', title: 'Blog' } },
      { id: '', type: 'blog-preview', order: 2, enabled: true, settings: { postLimit: 12, layout: 'grid', showExcerpt: true, showDate: true } },
    ],
  },
  {
    type: 'gallery',
    name: 'Gallery Page',
    description: 'Showcase your work in a visual layout',
    icon: Image,
    defaultSlug: 'gallery',
    defaultSections: [
      { id: '', type: 'hero-simple', order: 1, enabled: true, settings: { height: 'small', title: 'Gallery' } },
      { id: '', type: 'gallery', order: 2, enabled: true, settings: { galleryStyle: 'masonry', galleryColumns: 3 } },
    ],
  },
  {
    type: 'faq',
    name: 'FAQ Page',
    description: 'Answer common customer questions',
    icon: HelpCircle,
    defaultSlug: 'faq',
    defaultSections: [
      { id: '', type: 'hero-simple', order: 1, enabled: true, settings: { height: 'small', title: 'Frequently Asked Questions' } },
      { id: '', type: 'faq', order: 2, enabled: true, settings: { faqStyle: 'accordion' } },
    ],
  },
  {
    type: 'custom',
    name: 'Custom Page',
    description: 'Create a blank page with any content',
    icon: FileText,
    defaultSlug: '',
    defaultSections: [
      { id: '', type: 'hero-simple', order: 1, enabled: true, settings: { height: 'small' } },
      { id: '', type: 'text-image', order: 2, enabled: true, settings: {} },
    ],
  },
]

export function AddPageModal({ isOpen, onClose, onAddPage, existingPages }: AddPageModalProps) {
  const [selectedType, setSelectedType] = useState<PageType | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState<string | null>(null)

  if (!isOpen) return null

  const selectedTemplate = PAGE_TEMPLATES.find(t => t.type === selectedType)

  // Check if page type already exists (for non-custom types)
  const isTypeUsed = (type: PageType) => {
    if (type === 'custom') return false
    return existingPages.some(p => p.type === type)
  }

  const handleSelectType = (template: PageTemplate) => {
    setSelectedType(template.type)
    setTitle(template.name.replace(' Page', ''))
    setSlug(template.defaultSlug)
    setSlugError(null)

    // Validate slug immediately
    if (template.defaultSlug) {
      const validation = validatePageSlug(template.defaultSlug, existingPages)
      if (!validation.valid) {
        setSlugError(validation.error || null)
      }
    }
  }

  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    setSlug(normalized)

    const validation = validatePageSlug(normalized, existingPages)
    setSlugError(validation.valid ? null : (validation.error || null))
  }

  const handleCreate = () => {
    if (!selectedTemplate || !title.trim() || slugError) return

    // Generate unique IDs for sections
    const sections = selectedTemplate.defaultSections.map(section => ({
      ...section,
      id: generateSectionId(),
      settings: {
        ...section.settings,
        title: section.settings.title || title,
      },
    }))

    const newPage: WebsitePage = {
      id: generatePageId(),
      slug: slug,
      title: title.trim(),
      type: selectedTemplate.type,
      showInNavigation: true,
      navigationOrder: existingPages.length + 1,
      enabled: true,
      sections,
    }

    onAddPage(newPage)
    handleClose()
  }

  const handleClose = () => {
    setSelectedType(null)
    setTitle('')
    setSlug('')
    setSlugError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add New Page</h2>
            <p className="text-sm text-gray-500">Choose a page type to get started</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!selectedType ? (
            // Step 1: Choose page type
            <div className="grid grid-cols-2 gap-3">
              {PAGE_TEMPLATES.map((template) => {
                const Icon = template.icon
                const used = isTypeUsed(template.type)

                return (
                  <button
                    key={template.type}
                    onClick={() => !used && handleSelectType(template)}
                    disabled={used}
                    className={[
                      'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      used
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer',
                    ].join(' ')}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{template.name}</span>
                        {used && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                            Already added
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            // Step 2: Configure page
            <div className="space-y-6">
              {/* Selected Type Preview */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                {selectedTemplate && (
                  <>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <selectedTemplate.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-medium text-blue-900">{selectedTemplate.name}</span>
                      <p className="text-sm text-blue-700">{selectedTemplate.description}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Page Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Page Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., About Us"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This appears in the navigation and as the page heading
                </p>
              </div>

              {/* Page URL (Slug) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Page URL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">yourstore.madebuy.com/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="page-url"
                    className={[
                      'flex-1 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                      slugError
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500',
                    ].join(' ')}
                  />
                </div>
                {slugError && (
                  <p className="text-xs text-red-600 mt-1">{slugError}</p>
                )}
                {!slugError && (
                  <p className="text-xs text-gray-500 mt-1">
                    Use lowercase letters, numbers, and hyphens only
                  </p>
                )}
              </div>

              {/* Change Type Button */}
              <button
                onClick={() => setSelectedType(null)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← Choose a different page type
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedType && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !!slugError}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              Create Page
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
