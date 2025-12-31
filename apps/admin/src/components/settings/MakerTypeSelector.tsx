'use client'

import { useState } from 'react'
import {
  Gem,
  Shirt,
  Palette,
  Coffee,
  TreeDeciduous,
  Scissors,
  Briefcase,
  Flame,
  Droplets,
  CakeSlice,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MakerType } from '@madebuy/shared/src/constants/makerPresets'
import {
  MAKER_TYPES,
  MAKER_CATEGORY_PRESETS,
  MAKER_MATERIAL_PRESETS,
} from '@madebuy/shared/src/constants/makerPresets'

// Icon mapping for maker types
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Gem,
  Shirt,
  Palette,
  Coffee,
  TreeDeciduous,
  Scissors,
  Briefcase,
  Flame,
  Droplets,
  CakeSlice,
  Sparkles,
}

interface MakerTypeSelectorProps {
  value?: MakerType
  onChange: (type: MakerType) => void
  disabled?: boolean
}

export function MakerTypeSelector({ value, onChange, disabled }: MakerTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<MakerType | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const previewType = hoveredType || value

  const handleSelect = async (type: MakerType) => {
    if (disabled || isSaving) return
    setIsSaving(true)
    try {
      await onChange(type)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Maker Type Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MAKER_TYPES.map((makerType) => {
          const Icon = ICONS[makerType.icon] || Sparkles
          const isSelected = value === makerType.id
          const isHovered = hoveredType === makerType.id

          return (
            <button
              key={makerType.id}
              onClick={() => handleSelect(makerType.id)}
              onMouseEnter={() => setHoveredType(makerType.id)}
              onMouseLeave={() => setHoveredType(null)}
              disabled={disabled || isSaving}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all',
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
                (disabled || isSaving) && 'cursor-not-allowed opacity-50'
              )}
            >
              {isSelected && (
                <div className="absolute right-2 top-2 rounded-full bg-blue-500 p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  isSelected || isHovered
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 text-sm">{makerType.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                  {makerType.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Preview Panel */}
      {previewType && previewType !== 'custom' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {hoveredType ? 'Preview: ' : 'Your '}
            {MAKER_TYPES.find((t) => t.id === previewType)?.name} Categories
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Product Categories
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MAKER_CATEGORY_PRESETS[previewType].map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Material Categories
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MAKER_MATERIAL_PRESETS[previewType].map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Type Info */}
      {previewType === 'custom' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-sm font-medium text-amber-800 mb-2">Custom Categories</h4>
          <p className="text-sm text-amber-700">
            Start with a blank slate and define all your own product and material categories.
            Perfect for unique crafts that don&apos;t fit standard categories.
          </p>
        </div>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  )
}
