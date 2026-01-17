'use client'

import type {
  WebsitePage,
  WebsiteTemplate,
} from '@madebuy/shared/src/types/template'
import {
  getDefaultPages,
  TEMPLATE_DEFINITIONS,
} from '@madebuy/shared/src/types/template'
import { Check, Eye, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'

interface TemplateTabProps {
  currentTemplate: WebsiteTemplate | null
  onSelectTemplate: (template: WebsiteTemplate, pages: WebsitePage[]) => void
  onBuildCustom: () => void
}

const TEMPLATE_PREVIEWS: Record<
  WebsiteTemplate,
  { gradient: string; accent: string }
> = {
  'classic-store': {
    gradient: 'from-slate-800 via-slate-700 to-slate-900',
    accent: '#3B82F6',
  },
  'landing-page': {
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    accent: '#8B5CF6',
  },
  portfolio: {
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    accent: '#F59E0B',
  },
  magazine: {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    accent: '#10B981',
  },
}

export function TemplateTab({
  currentTemplate,
  onSelectTemplate,
  onBuildCustom,
}: TemplateTabProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<WebsiteTemplate | null>(currentTemplate)
  const [hoveredTemplate, setHoveredTemplate] =
    useState<WebsiteTemplate | null>(null)

  const handleSelect = (templateId: WebsiteTemplate) => {
    setSelectedTemplate(templateId)
  }

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      const pages = getDefaultPages(selectedTemplate)
      onSelectTemplate(selectedTemplate, pages)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif text-gray-900 mb-3">
          Choose Your Website Style
        </h1>
        <p className="text-gray-600 text-lg">
          Pick a design that matches your brand. You can customize everything
          after.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.values(TEMPLATE_DEFINITIONS).map((template) => {
          const preview = TEMPLATE_PREVIEWS[template.id]
          const isSelected = selectedTemplate === template.id
          const isHovered = hoveredTemplate === template.id

          return (
            <button
              type="button"
              key={template.id}
              onClick={() => handleSelect(template.id)}
              onMouseEnter={() => setHoveredTemplate(template.id)}
              onMouseLeave={() => setHoveredTemplate(null)}
              className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 text-left ${
                isSelected
                  ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {/* Preview Image Area */}
              <div
                className={`relative h-40 bg-gradient-to-br ${preview.gradient} overflow-hidden`}
              >
                {/* Decorative elements */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 right-4 h-3 bg-white/30 rounded" />
                  <div className="absolute top-10 left-4 w-20 h-2 bg-white/20 rounded" />
                  <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                    <div className="h-16 bg-white/10 rounded" />
                    <div className="h-16 bg-white/10 rounded" />
                    <div className="h-16 bg-white/10 rounded" />
                  </div>
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Hover preview button */}
                {isHovered && !isSelected && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in duration-200">
                    <span className="flex items-center gap-2 bg-white/90 text-gray-900 px-4 py-2 rounded-full text-sm font-medium">
                      <Eye className="w-4 h-4" />
                      Select
                    </span>
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {template.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Page count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {template.defaultPages?.length || 5} pages included
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: preview.accent }}
                  >
                    {template.bestFor}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          type="button"
          onClick={handleUseTemplate}
          disabled={!selectedTemplate}
          className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-base font-semibold transition-all duration-200 ${
            selectedTemplate
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          Use This Template
        </button>

        <button
          type="button"
          onClick={onBuildCustom}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Wand2 className="w-5 h-5" />
          Build Custom
        </button>
      </div>

      {/* Selected Template Details */}
      {selectedTemplate && (
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-xl bg-gradient-to-br ${TEMPLATE_PREVIEWS[selectedTemplate].gradient} flex items-center justify-center flex-shrink-0`}
              >
                <Sparkles className="w-8 h-8 text-white/80" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {TEMPLATE_DEFINITIONS[selectedTemplate].name} Template
                </h3>
                <p className="text-gray-600 mb-4">
                  {TEMPLATE_DEFINITIONS[selectedTemplate].description}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TEMPLATE_DEFINITIONS[selectedTemplate].features.map(
                    (feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        {feature}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
