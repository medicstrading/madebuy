'use client'

import { useState } from 'react'
import {
  Home,
  ShoppingBag,
  Info,
  Mail,
  BookOpen,
  Image,
  HelpCircle,
  FileText,
  Plus,
  GripVertical,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import type { WebsitePage, PageType } from '@madebuy/shared'

interface PagesManagerProps {
  pages: WebsitePage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  onUpdatePage: (pageId: string, updates: Partial<WebsitePage>) => void
  onDeletePage: (pageId: string) => void
  onAddPage: () => void
  onReorderPages: (pages: WebsitePage[]) => void
  tenantSlug: string
  webBaseUrl: string
}

const PAGE_ICONS: Record<PageType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  shop: ShoppingBag,
  about: Info,
  contact: Mail,
  blog: BookOpen,
  gallery: Image,
  faq: HelpCircle,
  custom: FileText,
}

const PAGE_TYPE_LABELS: Record<PageType, string> = {
  home: 'Home Page',
  shop: 'Shop',
  about: 'About',
  contact: 'Contact',
  blog: 'Blog',
  gallery: 'Gallery',
  faq: 'FAQ',
  custom: 'Custom Page',
}

export function PagesManager({
  pages,
  selectedPageId,
  onSelectPage,
  onUpdatePage,
  onDeletePage,
  onAddPage,
  tenantSlug,
  webBaseUrl,
}: PagesManagerProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const sortedPages = [...pages].sort((a, b) => a.navigationOrder - b.navigationOrder)

  const handleStartEdit = (page: WebsitePage) => {
    setEditingPageId(page.id)
    setEditTitle(page.title)
  }

  const handleSaveEdit = (pageId: string) => {
    if (editTitle.trim()) {
      onUpdatePage(pageId, { title: editTitle.trim() })
    }
    setEditingPageId(null)
    setEditTitle('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(pageId)
    } else if (e.key === 'Escape') {
      setEditingPageId(null)
      setEditTitle('')
    }
  }

  const getPageUrl = (page: WebsitePage) => {
    const slug = page.slug || ''
    return `${webBaseUrl}/${tenantSlug}${slug ? `/${slug}` : ''}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Your Pages</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click a page to edit its sections
            </p>
          </div>
          <button
            onClick={onAddPage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Page
          </button>
        </div>
      </div>

      {/* Pages List */}
      <div className="divide-y divide-gray-100">
        {sortedPages.map((page) => {
          const Icon = PAGE_ICONS[page.type]
          const isSelected = selectedPageId === page.id
          const isEditing = editingPageId === page.id
          const isHome = page.type === 'home'

          return (
            <div
              key={page.id}
              className={[
                'group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all',
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50',
                !page.enabled && 'opacity-60',
              ].filter(Boolean).join(' ')}
              onClick={() => !isEditing && onSelectPage(page.id)}
            >
              {/* Drag Handle */}
              <div className="text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Page Icon */}
              <div
                className={[
                  'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600',
                ].join(' ')}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Page Info */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleSaveEdit(page.id)}
                    onKeyDown={(e) => handleKeyDown(e, page.id)}
                    className="w-full px-2 py-1 text-sm font-medium border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {page.title}
                      </span>
                      {!page.enabled && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                          Hidden
                        </span>
                      )}
                      {isHome && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          Main
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      /{tenantSlug}{page.slug ? `/${page.slug}` : ''}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Preview Link */}
                <a
                  href={getPageUrl(page)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Preview page"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>

                {/* Edit Title */}
                <button
                  onClick={() => handleStartEdit(page)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Rename page"
                >
                  <Edit3 className="h-4 w-4" />
                </button>

                {/* Toggle Visibility */}
                <button
                  onClick={() => onUpdatePage(page.id, { enabled: !page.enabled })}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title={page.enabled ? 'Hide page' : 'Show page'}
                >
                  {page.enabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                {/* Delete (not for home page) */}
                {!isHome && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${page.title}"? This cannot be undone.`)) {
                        onDeletePage(page.id)
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete page"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <ChevronRight className="h-5 w-5 text-blue-600" />
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {pages.length === 0 && (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No pages yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Choose a template to get started
          </p>
        </div>
      )}
    </div>
  )
}
