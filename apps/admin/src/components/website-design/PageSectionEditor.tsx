'use client'

import type { PageSection, PageSectionType, WebsitePage } from '@madebuy/shared'
import { generateSectionId } from '@madebuy/shared'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Grid3X3,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  Layout,
  Mail,
  MessageSquare,
  Newspaper,
  Plus,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Type,
  Users,
} from 'lucide-react'
import { useState } from 'react'

interface PageSectionEditorProps {
  page: WebsitePage
  onUpdateSections: (sections: PageSection[]) => void
}

const SECTION_CONFIG: Record<
  PageSectionType,
  {
    name: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    color: string
  }
> = {
  'hero-slider': {
    name: 'Hero Slider',
    description: 'Full-width image carousel',
    icon: ImageIcon,
    color: 'bg-purple-100 text-purple-600',
  },
  'hero-simple': {
    name: 'Hero Banner',
    description: 'Simple hero with text',
    icon: Layout,
    color: 'bg-purple-100 text-purple-600',
  },
  'product-grid': {
    name: 'Product Grid',
    description: 'Display your products',
    icon: Grid3X3,
    color: 'bg-blue-100 text-blue-600',
  },
  'product-featured': {
    name: 'Featured Product',
    description: 'Highlight one product',
    icon: Star,
    color: 'bg-blue-100 text-blue-600',
  },
  collections: {
    name: 'Collections',
    description: 'Show product collections',
    icon: Grid3X3,
    color: 'bg-blue-100 text-blue-600',
  },
  'feature-cards': {
    name: 'Feature Cards',
    description: '3-column feature grid',
    icon: Layout,
    color: 'bg-green-100 text-green-600',
  },
  'blog-preview': {
    name: 'Blog Posts',
    description: 'Show recent articles',
    icon: Newspaper,
    color: 'bg-orange-100 text-orange-600',
  },
  testimonials: {
    name: 'Testimonials',
    description: 'Customer reviews',
    icon: MessageSquare,
    color: 'bg-yellow-100 text-yellow-600',
  },
  cta: {
    name: 'Call to Action',
    description: 'Encourage action',
    icon: ArrowRight,
    color: 'bg-red-100 text-red-600',
  },
  'text-image': {
    name: 'Text & Image',
    description: 'Two column layout',
    icon: Layout,
    color: 'bg-green-100 text-green-600',
  },
  gallery: {
    name: 'Image Gallery',
    description: 'Photo gallery',
    icon: ImageIcon,
    color: 'bg-pink-100 text-pink-600',
  },
  faq: {
    name: 'FAQ',
    description: 'Questions & answers',
    icon: HelpCircle,
    color: 'bg-cyan-100 text-cyan-600',
  },
  about: {
    name: 'About Section',
    description: 'Tell your story',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-600',
  },
  contact: {
    name: 'Contact Form',
    description: 'Get in touch',
    icon: Mail,
    color: 'bg-teal-100 text-teal-600',
  },
  'custom-order': {
    name: 'Custom Orders',
    description: 'Commission requests',
    icon: Sparkles,
    color: 'bg-violet-100 text-violet-600',
  },
  newsletter: {
    name: 'Newsletter',
    description: 'Email signup',
    icon: Mail,
    color: 'bg-rose-100 text-rose-600',
  },
  spacer: {
    name: 'Spacer',
    description: 'Visual spacing',
    icon: Type,
    color: 'bg-gray-100 text-gray-600',
  },
  reviews: {
    name: 'Reviews',
    description: 'Customer reviews',
    icon: MessageSquare,
    color: 'bg-yellow-100 text-yellow-600',
  },
}

const SECTION_CATEGORIES = [
  {
    name: 'Hero & Headers',
    types: ['hero-simple', 'hero-slider'] as PageSectionType[],
  },
  {
    name: 'Products',
    types: [
      'product-grid',
      'product-featured',
      'collections',
    ] as PageSectionType[],
  },
  {
    name: 'Content',
    types: [
      'text-image',
      'feature-cards',
      'about',
      'gallery',
    ] as PageSectionType[],
  },
  {
    name: 'Engagement',
    types: [
      'testimonials',
      'cta',
      'newsletter',
      'blog-preview',
    ] as PageSectionType[],
  },
  {
    name: 'Support',
    types: ['faq', 'contact', 'custom-order'] as PageSectionType[],
  },
  { name: 'Utility', types: ['spacer'] as PageSectionType[] },
]

export function PageSectionEditor({
  page,
  onUpdateSections,
}: PageSectionEditorProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    null,
  )
  const [showAddSection, setShowAddSection] = useState(false)
  const [_draggedIndex, _setDraggedIndex] = useState<number | null>(null)

  const sections = [...page.sections].sort((a, b) => a.order - b.order)

  const toggleSection = (sectionId: string, enabled: boolean) => {
    const updated = sections.map((s) =>
      s.id === sectionId ? { ...s, enabled } : s,
    )
    onUpdateSections(updated)
  }

  const deleteSection = (sectionId: string) => {
    if (!confirm('Delete this section? This cannot be undone.')) return
    const updated = sections.filter((s) => s.id !== sectionId)
    onUpdateSections(updated)
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sections.length) return

    const newSections = [...sections]
    const [moved] = newSections.splice(index, 1)
    newSections.splice(newIndex, 0, moved)

    // Update order values
    const reordered = newSections.map((s, i) => ({ ...s, order: i + 1 }))
    onUpdateSections(reordered)
  }

  const addSection = (type: PageSectionType) => {
    const config = SECTION_CONFIG[type]
    const newSection: PageSection = {
      id: generateSectionId(),
      type,
      order: sections.length + 1,
      enabled: true,
      settings: {
        title: config.name,
      },
    }
    onUpdateSections([...sections, newSection])
    setShowAddSection(false)
  }

  const updateSectionSettings = (
    sectionId: string,
    settings: PageSection['settings'],
  ) => {
    const updated = sections.map((s) =>
      s.id === sectionId
        ? { ...s, settings: { ...s.settings, ...settings } }
        : s,
    )
    onUpdateSections(updated)
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{page.title} Page</h3>
          <p className="text-sm text-gray-500">
            {sections.length} section{sections.length !== 1 ? 's' : ''} • Drag
            to reorder
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddSection(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </button>
      </div>

      {/* Sections List */}
      <div className="space-y-2">
        {sections.map((section, index) => {
          const config = SECTION_CONFIG[section.type]
          const Icon = config?.icon || Layout
          const isExpanded = expandedSectionId === section.id

          return (
            <div
              key={section.id}
              className={[
                'border rounded-xl overflow-hidden transition-all',
                section.enabled
                  ? 'border-gray-200 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-60',
                isExpanded ? 'ring-2 ring-blue-500' : '',
              ].join(' ')}
            >
              {/* Section Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Drag Handle */}
                <div className="text-gray-300 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${config?.color || 'bg-gray-100 text-gray-600'}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    {config?.name || section.type}
                  </div>
                  <div className="text-xs text-gray-500">
                    {config?.description || ''}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={() => moveSection(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={() => moveSection(index, 'down')}
                    disabled={index === sections.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Toggle Visibility */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id, !section.enabled)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title={section.enabled ? 'Hide section' : 'Show section'}
                  >
                    {section.enabled ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>

                  {/* Settings */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSectionId(isExpanded ? null : section.id)
                    }
                    className={[
                      'p-1.5 rounded transition-colors',
                      isExpanded
                        ? 'text-blue-600 bg-blue-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                    ].join(' ')}
                    title="Edit settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteSection(section.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Settings */}
              {isExpanded && (
                <div className="px-4 py-4 border-t border-gray-100 bg-gray-50">
                  <SectionSettings
                    section={section}
                    onUpdate={(settings) =>
                      updateSectionSettings(section.id, settings)
                    }
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Layout className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No sections yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Add sections to build your page
          </p>
          <button
            type="button"
            onClick={() => setShowAddSection(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Section
          </button>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Add Section</h3>
                <p className="text-sm text-gray-500">
                  Choose a section type to add
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSection(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {SECTION_CATEGORIES.map((category) => (
                <div key={category.name} className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {category.name}
                  </h4>
                  <div className="space-y-1">
                    {category.types.map((type) => {
                      const config = SECTION_CONFIG[type]
                      const Icon = config.icon

                      return (
                        <button
                          type="button"
                          key={type}
                          onClick={() => addSection(type)}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-gray-100 transition-colors"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {config.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {config.description}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Simplified section settings component
function SectionSettings({
  section,
  onUpdate,
}: {
  section: PageSection
  onUpdate: (settings: PageSection['settings']) => void
}) {
  const settings = section.settings

  return (
    <div className="space-y-4">
      {/* Title (common to most sections) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Section Title
        </label>
        <input
          type="text"
          value={settings.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Enter a title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subtitle (optional)
        </label>
        <input
          type="text"
          value={settings.subtitle || ''}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          placeholder="Enter a subtitle..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Type-specific settings */}
      {section.type === 'hero-simple' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Height
          </label>
          <select
            value={settings.height || 'medium'}
            onChange={(e) =>
              onUpdate({
                height: e.target.value as 'small' | 'medium' | 'large' | 'full',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="full">Full Screen</option>
          </select>
        </div>
      )}

      {section.type === 'product-grid' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Columns
            </label>
            <select
              value={settings.columns || 4}
              onChange={(e) =>
                onUpdate({ columns: Number(e.target.value) as 2 | 3 | 4 | 5 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
              <option value={5}>5 Columns</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Products
            </label>
            <input
              type="number"
              value={settings.limit || 12}
              onChange={(e) => onUpdate({ limit: Number(e.target.value) })}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPrices"
              checked={settings.showPrices !== false}
              onChange={(e) => onUpdate({ showPrices: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showPrices" className="text-sm text-gray-700">
              Show prices
            </label>
          </div>
        </>
      )}

      {section.type === 'text-image' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Position
          </label>
          <select
            value={settings.imagePosition || 'right'}
            onChange={(e) =>
              onUpdate({ imagePosition: e.target.value as 'left' | 'right' })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
      )}

      {section.type === 'blog-preview' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Posts
          </label>
          <input
            type="number"
            value={settings.postLimit || 3}
            onChange={(e) => onUpdate({ postLimit: Number(e.target.value) })}
            min={1}
            max={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {section.type === 'gallery' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Columns
          </label>
          <select
            value={settings.galleryColumns || 3}
            onChange={(e) =>
              onUpdate({ galleryColumns: Number(e.target.value) as 2 | 3 | 4 })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={2}>2 Columns</option>
            <option value={3}>3 Columns</option>
            <option value={4}>4 Columns</option>
          </select>
        </div>
      )}

      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Background Color
        </label>
        <div className="flex gap-2">
          {['#ffffff', '#f9fafb', '#f3f4f6', '#e5e7eb'].map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => onUpdate({ backgroundColor: color })}
              className={[
                'w-8 h-8 rounded-lg border-2 transition-all',
                settings.backgroundColor === color
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300',
              ].join(' ')}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={settings.backgroundColor || '#ffffff'}
            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
            className="w-8 h-8 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Padding */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Top Padding
          </label>
          <select
            value={settings.paddingTop || 'medium'}
            onChange={(e) =>
              onUpdate({
                paddingTop: e.target.value as
                  | 'none'
                  | 'small'
                  | 'medium'
                  | 'large',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bottom Padding
          </label>
          <select
            value={settings.paddingBottom || 'medium'}
            onChange={(e) =>
              onUpdate({
                paddingBottom: e.target.value as
                  | 'none'
                  | 'small'
                  | 'medium'
                  | 'large',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">None</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </div>
  )
}
