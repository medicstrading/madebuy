'use client'

import { useState, useEffect } from 'react'
import {
  Home, ShoppingBag, User, Mail, BookOpen, Image as ImageIcon,
  HelpCircle, FileText, ChevronRight, Check, Circle, Plus, Eye,
  Loader2
} from 'lucide-react'
import type { WebsitePage, PageSection } from '@madebuy/shared/src/types/template'
import { PageContentEditor } from '../content-editor/PageContentEditor'
import { ContentProgress } from '../content-editor/ContentProgress'

interface ContentTabProps {
  pages: WebsitePage[]
  onPagesChange: (pages: WebsitePage[]) => void
  tenantSlug?: string
  onAddPage?: () => void
}

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  shop: ShoppingBag,
  about: User,
  contact: Mail,
  blog: BookOpen,
  gallery: ImageIcon,
  faq: HelpCircle,
  custom: FileText,
}

function calculatePageCompletion(page: WebsitePage): { complete: number; total: number } {
  let complete = 0
  let total = 0

  for (const section of page.sections) {
    if (!section.enabled) continue
    total++
    if (section.settings?.isContentComplete) {
      complete++
    }
  }

  return { complete, total }
}

function calculateTotalCompletion(pages: WebsitePage[]): { complete: number; total: number } {
  let complete = 0
  let total = 0

  for (const page of pages) {
    const pageCompletion = calculatePageCompletion(page)
    complete += pageCompletion.complete
    total += pageCompletion.total
  }

  return { complete, total }
}

export function ContentTab({ pages, onPagesChange, tenantSlug, onAddPage }: ContentTabProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id || '')

  const selectedPage = pages.find(p => p.id === selectedPageId)
  const totalCompletion = calculateTotalCompletion(pages)
  const progressPercent = totalCompletion.total > 0
    ? Math.round((totalCompletion.complete / totalCompletion.total) * 100)
    : 0

  const handleSectionChange = (pageId: string, updatedSection: PageSection) => {
    const updatedPages = pages.map(page => {
      if (page.id !== pageId) return page
      return {
        ...page,
        sections: page.sections.map(section =>
          section.id === updatedSection.id ? updatedSection : section
        ),
      }
    })
    onPagesChange(updatedPages)
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left Sidebar - Page Navigation */}
      <div className="w-64 flex-shrink-0 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Your Pages
          </h2>
        </div>

        {/* Page List */}
        <nav className="space-y-1">
          {pages.filter(p => p.enabled).map((page) => {
            const Icon = PAGE_ICONS[page.type] || FileText
            const isSelected = page.id === selectedPageId
            const completion = calculatePageCompletion(page)
            const isComplete = completion.total > 0 && completion.complete === completion.total

            return (
              <button
                key={page.id}
                onClick={() => setSelectedPageId(page.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {/* Completion indicator */}
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <Circle className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-gray-300'}`} />
                  )}
                </div>

                {/* Page icon and name */}
                <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`} />
                <span className="flex-1 truncate">{page.title}</span>

                {/* Progress indicator */}
                {completion.total > 0 && !isComplete && (
                  <span className="text-xs text-gray-400">
                    {completion.complete}/{completion.total}
                  </span>
                )}

                {isSelected && (
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Add Page Button */}
        {onAddPage && (
          <button
            onClick={onAddPage}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Page</span>
          </button>
        )}

        {/* Progress Section */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Progress
          </h3>
          <ContentProgress
            complete={totalCompletion.complete}
            total={totalCompletion.total}
          />
        </div>
      </div>

      {/* Right Panel - Page Content Editor */}
      <div className="flex-1 min-w-0">
        {selectedPage ? (
          <PageContentEditor
            page={selectedPage}
            onSectionChange={(section) => handleSectionChange(selectedPage.id, section)}
            tenantSlug={tenantSlug}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a page to edit its content</p>
          </div>
        )}
      </div>
    </div>
  )
}
