'use client'

import { useState } from 'react'
import {
  Plus, Trash2, GripVertical, Eye, EyeOff, Settings, ChevronLeft,
  Home, ShoppingBag, User, Mail, BookOpen, Image as ImageIcon, HelpCircle, FileText,
  ArrowRight
} from 'lucide-react'
import type { WebsitePage, PageSection, PageType, PageSectionType } from '@madebuy/shared/src/types/template'
import { generatePageId, createCustomPage, SECTION_TYPE_LABELS } from '@madebuy/shared/src/types/template'

interface CustomBuilderViewProps {
  pages: WebsitePage[]
  onPagesChange: (pages: WebsitePage[]) => void
  onBackToTemplates: () => void
  onContinueToContent: () => void
}

const PAGE_ICONS: Record<PageType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  shop: ShoppingBag,
  about: User,
  contact: Mail,
  blog: BookOpen,
  gallery: ImageIcon,
  faq: HelpCircle,
  custom: FileText,
}

const PAGE_TYPE_OPTIONS: { type: PageType; name: string; description: string }[] = [
  { type: 'home', name: 'Home', description: 'Main landing page' },
  { type: 'shop', name: 'Shop', description: 'Product listing page' },
  { type: 'about', name: 'About', description: 'About your business' },
  { type: 'contact', name: 'Contact', description: 'Contact form page' },
  { type: 'blog', name: 'Blog', description: 'Blog posts page' },
  { type: 'gallery', name: 'Gallery', description: 'Image gallery' },
  { type: 'faq', name: 'FAQ', description: 'Frequently asked questions' },
  { type: 'custom', name: 'Custom', description: 'Blank custom page' },
]

const SECTION_CATEGORIES = [
  {
    name: 'Hero & Headers',
    sections: ['hero-simple', 'hero-slider'] as PageSectionType[],
  },
  {
    name: 'Products',
    sections: ['product-grid', 'product-featured', 'collections'] as PageSectionType[],
  },
  {
    name: 'Content',
    sections: ['feature-cards', 'text-image', 'gallery', 'about'] as PageSectionType[],
  },
  {
    name: 'Engagement',
    sections: ['blog-preview', 'testimonials', 'cta', 'newsletter'] as PageSectionType[],
  },
  {
    name: 'Support',
    sections: ['faq', 'contact', 'custom-order'] as PageSectionType[],
  },
]

export function CustomBuilderView({
  pages,
  onPagesChange,
  onBackToTemplates,
  onContinueToContent,
}: CustomBuilderViewProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id || '')
  const [showAddPage, setShowAddPage] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)

  const selectedPage = pages.find(p => p.id === selectedPageId)

  const handleAddPage = (type: PageType) => {
    const newPage = createCustomPage(type, `${type.charAt(0).toUpperCase() + type.slice(1)} Page`)
    onPagesChange([...pages, newPage])
    setSelectedPageId(newPage.id)
    setShowAddPage(false)
  }

  const handleDeletePage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId)
    if (page?.type === 'home') {
      alert('Cannot delete the home page')
      return
    }
    const newPages = pages.filter(p => p.id !== pageId)
    onPagesChange(newPages)
    if (selectedPageId === pageId) {
      setSelectedPageId(newPages[0]?.id || '')
    }
  }

  const handleTogglePageVisibility = (pageId: string) => {
    onPagesChange(pages.map(p =>
      p.id === pageId ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const handleAddSection = (sectionType: PageSectionType) => {
    if (!selectedPage) return

    const newSection: PageSection = {
      id: `section-${Date.now()}`,
      type: sectionType,
      order: selectedPage.sections.length,
      enabled: true,
      settings: {},
    }

    onPagesChange(pages.map(p =>
      p.id === selectedPageId
        ? { ...p, sections: [...p.sections, newSection] }
        : p
    ))
    setShowAddSection(false)
  }

  const handleDeleteSection = (sectionId: string) => {
    if (!selectedPage) return

    onPagesChange(pages.map(p =>
      p.id === selectedPageId
        ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) }
        : p
    ))
  }

  const handleToggleSectionVisibility = (sectionId: string) => {
    if (!selectedPage) return

    onPagesChange(pages.map(p =>
      p.id === selectedPageId
        ? {
            ...p,
            sections: p.sections.map(s =>
              s.id === sectionId ? { ...s, enabled: !s.enabled } : s
            ),
          }
        : p
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBackToTemplates}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to Templates</span>
          </button>
          <h1 className="text-3xl font-serif text-gray-900">Custom Website Builder</h1>
          <p className="text-gray-600 mt-1">Build your website from scratch with full control over pages and sections.</p>
        </div>
      </div>

      <div className="flex gap-6 min-h-[500px]">
        {/* Left Sidebar - Pages */}
        <div className="w-64 flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Your Pages
            </h2>
          </div>

          <div className="space-y-1">
            {pages.map((page) => {
              const Icon = PAGE_ICONS[page.type] || FileText
              const isSelected = page.id === selectedPageId

              return (
                <div
                  key={page.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                  <button
                    onClick={() => setSelectedPageId(page.id)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <span className="truncate font-medium">{page.title}</span>
                  </button>
                  <button
                    onClick={() => handleTogglePageVisibility(page.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title={page.enabled ? 'Hide page' : 'Show page'}
                  >
                    {page.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  {page.type !== 'home' && (
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Delete page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={() => setShowAddPage(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Page</span>
          </button>
        </div>

        {/* Right Panel - Section Management */}
        <div className="flex-1 min-w-0">
          {selectedPage ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedPage.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedPage.sections.length} sections
                  </p>
                </div>
              </div>

              {/* Sections List */}
              <div className="space-y-2 mb-6">
                {selectedPage.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                      section.enabled
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900">
                        {SECTION_TYPE_LABELS[section.type] || section.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleSectionVisibility(section.id)}
                        className={`p-1.5 rounded-lg ${
                          section.enabled
                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={section.enabled ? 'Hide section' : 'Show section'}
                      >
                        {section.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="Delete section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {selectedPage.sections.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                    <p>No sections yet. Add sections to build your page.</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowAddSection(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Section</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a page to manage its sections</p>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onContinueToContent}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all"
        >
          Continue to Content
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Add Page Modal */}
      {showAddPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddPage(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add New Page</h3>
            <div className="grid grid-cols-2 gap-3">
              {PAGE_TYPE_OPTIONS.map((option) => {
                const Icon = PAGE_ICONS[option.type]
                return (
                  <button
                    key={option.type}
                    onClick={() => handleAddPage(option.type)}
                    className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors"
                  >
                    <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">{option.name}</h4>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowAddPage(false)}
              className="mt-4 w-full px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddSection(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add Section</h3>
            <div className="space-y-6">
              {SECTION_CATEGORIES.map((category) => (
                <div key={category.name}>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {category.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {category.sections.map((sectionType) => (
                      <button
                        key={sectionType}
                        onClick={() => handleAddSection(sectionType)}
                        className="px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors"
                      >
                        <span className="font-medium text-gray-900">
                          {SECTION_TYPE_LABELS[sectionType] || sectionType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAddSection(false)}
              className="mt-6 w-full px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
