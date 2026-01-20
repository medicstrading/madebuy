'use client'

import {
  MAKER_CATEGORY_PRESETS,
  MAKER_MATERIAL_PRESETS,
  MAKER_TYPES,
  type MakerType,
} from '@madebuy/shared'
import {
  AlertTriangle,
  Boxes,
  Briefcase,
  CakeSlice,
  Check,
  ChevronDown,
  Coffee,
  Droplets,
  Flame,
  Gem,
  Loader2,
  Package,
  Palette,
  Scissors,
  Shirt,
  Sparkles,
  TreeDeciduous,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

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
  onChange: (type: MakerType) => Promise<void>
  disabled?: boolean
  hasExistingCategories?: boolean
}

export function MakerTypeSelector({
  value,
  onChange,
  disabled,
  hasExistingCategories = false,
}: MakerTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<MakerType | undefined>(value)
  const [isSaving, setIsSaving] = useState(false)
  const [showBlockedWarning, setShowBlockedWarning] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync with prop when it changes
  useEffect(() => {
    setSelectedType(value)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasChanges = selectedType !== value

  const handleSelect = (type: MakerType) => {
    if (hasExistingCategories && value) {
      setShowBlockedWarning(true)
      setIsOpen(false)
      return
    }
    setSelectedType(type)
    setIsOpen(false)
  }

  const handleSave = async () => {
    if (!selectedType || !hasChanges || disabled || isSaving) return

    setIsSaving(true)
    try {
      await onChange(selectedType)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSelectedType(value)
    setShowBlockedWarning(false)
  }

  const currentTypeInfo = selectedType
    ? MAKER_TYPES.find((t) => t.id === selectedType)
    : null
  const CurrentIcon = currentTypeInfo
    ? ICONS[currentTypeInfo.icon] || Sparkles
    : null

  const productCategories =
    selectedType && selectedType !== 'custom'
      ? MAKER_CATEGORY_PRESETS[selectedType]
      : []
  const materialCategories =
    selectedType && selectedType !== 'custom'
      ? MAKER_MATERIAL_PRESETS[selectedType]
      : []

  return (
    <div className="space-y-6">
      {/* Blocked Warning */}
      {showBlockedWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">
                Cannot change maker type
              </h4>
              <p className="mt-1 text-sm text-amber-800">
                You have custom categories already set up. To change your maker
                type, you&apos;ll need to remove your custom categories first,
                or contact support for assistance.
              </p>
              <button
                type="button"
                onClick={() => setShowBlockedWarning(false)}
                className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all',
            'bg-white hover:border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2',
            isOpen
              ? 'border-stone-900 ring-2 ring-stone-900 ring-offset-2'
              : 'border-stone-200',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <div className="flex items-center gap-3">
            {CurrentIcon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
                <CurrentIcon className="h-5 w-5 text-stone-700" />
              </div>
            )}
            <div>
              <p className="font-medium text-stone-900">
                {currentTypeInfo?.name || 'Select your craft type'}
              </p>
              {currentTypeInfo && (
                <p className="text-sm text-stone-500">
                  {currentTypeInfo.description}
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-stone-400 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden">
            <div className="max-h-80 overflow-y-auto py-2">
              {MAKER_TYPES.map((makerType) => {
                const Icon = ICONS[makerType.icon] || Sparkles
                const isSelected = selectedType === makerType.id
                const isCurrent = value === makerType.id

                return (
                  <button
                    type="button"
                    key={makerType.id}
                    onClick={() => handleSelect(makerType.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected ? 'bg-stone-100' : 'hover:bg-stone-50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        isSelected
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'font-medium',
                          isSelected ? 'text-stone-900' : 'text-stone-700',
                        )}
                      >
                        {makerType.name}
                      </p>
                      <p className="text-sm text-stone-500 truncate">
                        {makerType.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                    {isSelected && !isCurrent && (
                      <Check className="h-4 w-4 text-stone-900" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category Preview Panel */}
      {selectedType && selectedType !== 'custom' && (
        <div
          className={cn(
            'rounded-xl border-2 bg-gradient-to-br from-stone-50 to-white p-6 transition-all duration-300',
            hasChanges ? 'border-stone-300' : 'border-stone-200',
          )}
        >
          <div className="grid gap-6 md:grid-cols-2">
            {/* Product Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-stone-500" />
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Product Categories
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {productCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-medium text-stone-700 border border-stone-200 shadow-sm"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Material Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Boxes className="h-4 w-4 text-stone-500" />
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Material Categories
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {materialCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-medium text-stone-700 border border-stone-200 shadow-sm"
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
      {selectedType === 'custom' && (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center">
          <Sparkles className="h-8 w-8 text-stone-400 mx-auto mb-3" />
          <h4 className="font-medium text-stone-900 mb-1">Custom Categories</h4>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Start with a blank slate and define all your own product and
            material categories. Perfect for unique crafts that don&apos;t fit
            standard presets.
          </p>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <p className="text-sm text-stone-500">Unsaved changes</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || disabled}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all',
                'bg-stone-900 text-white hover:bg-stone-800',
                'focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
