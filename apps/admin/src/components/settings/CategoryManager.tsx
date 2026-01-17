'use client'

import { Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CategoryManagerProps {
  title: string
  description?: string
  presetCategories: string[]
  customCategories: string[]
  onAddCategory: (category: string) => Promise<void>
  onRemoveCategory: (category: string) => Promise<void>
  disabled?: boolean
}

export function CategoryManager({
  title,
  description,
  presetCategories,
  customCategories,
  onAddCategory,
  onRemoveCategory,
  disabled,
}: CategoryManagerProps) {
  const [newCategory, setNewCategory] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [removingCategory, setRemovingCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Combine all categories for display
  const allCategories = [...presetCategories, ...customCategories]

  const handleAdd = async () => {
    const trimmed = newCategory.trim()
    if (!trimmed) return

    // Check for duplicates
    if (
      allCategories.some((cat) => cat.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError('This category already exists')
      return
    }

    setIsAdding(true)
    setError(null)
    try {
      await onAddCategory(trimmed)
      setNewCategory('')
    } catch (_err) {
      setError('Failed to add category')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (category: string) => {
    setRemovingCategory(category)
    setError(null)
    try {
      await onRemoveCategory(category)
    } catch (_err) {
      setError('Failed to remove category')
    } finally {
      setRemovingCategory(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>

      {/* Category List */}
      <div className="space-y-2">
        {/* Preset Categories */}
        {presetCategories.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              From Template
            </p>
            <div className="flex flex-wrap gap-2">
              {presetCategories.map((category) => (
                <span
                  key={`preset-${category}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm',
                    'border-gray-200 bg-gray-50 text-gray-700',
                  )}
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemove(category)}
                    disabled={disabled || removingCategory === category}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove category"
                  >
                    {removingCategory === category ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Custom Categories */}
        {customCategories.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Custom
            </p>
            <div className="flex flex-wrap gap-2">
              {customCategories.map((category) => (
                <span
                  key={`custom-${category}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm',
                    'border-blue-200 bg-blue-50 text-blue-700',
                  )}
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemove(category)}
                    disabled={disabled || removingCategory === category}
                    className="text-blue-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove category"
                  >
                    {removingCategory === category ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {allCategories.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            No categories yet. Add your first one below.
          </p>
        )}
      </div>

      {/* Add Category Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => {
            setNewCategory(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add custom category..."
          disabled={disabled || isAdding}
          className={cn(
            'flex-1 rounded-lg border px-3 py-2 text-sm',
            'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
          )}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || isAdding || !newCategory.trim()}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium',
            'bg-blue-600 text-white hover:bg-blue-700',
            'disabled:bg-gray-300 disabled:cursor-not-allowed',
          )}
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </button>
      </div>

      {/* Error Message */}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
