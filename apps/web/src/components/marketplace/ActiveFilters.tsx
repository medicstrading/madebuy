'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

export function ActiveFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const category = searchParams.get('category')
  const subcategory = searchParams.get('subcategory')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const minRating = searchParams.get('minRating')
  const query = searchParams.get('q')

  const hasFilters = category || subcategory || minPrice || maxPrice || minRating || query

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    router.push(`/marketplace/browse?${params.toString()}`)
  }

  const clearAll = () => {
    router.push('/marketplace/browse')
  }

  if (!hasFilters) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium text-gray-700">Active filters:</span>

      {query && (
        <FilterChip
          label={`Search: "${query}"`}
          onRemove={() => removeFilter('q')}
        />
      )}

      {category && (
        <FilterChip
          label={`Category: ${category}`}
          onRemove={() => removeFilter('category')}
        />
      )}

      {subcategory && (
        <FilterChip
          label={`Subcategory: ${subcategory}`}
          onRemove={() => removeFilter('subcategory')}
        />
      )}

      {(minPrice || maxPrice) && (
        <FilterChip
          label={`Price: ${minPrice || '0'} - ${maxPrice || '∞'}`}
          onRemove={() => {
            const params = new URLSearchParams(searchParams.toString())
            params.delete('minPrice')
            params.delete('maxPrice')
            router.push(`/marketplace/browse?${params.toString()}`)
          }}
        />
      )}

      {minRating && (
        <FilterChip
          label={`Rating: ${minRating}+ stars`}
          onRemove={() => removeFilter('minRating')}
        />
      )}

      <button
        onClick={clearAll}
        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
      >
        Clear all
      </button>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-blue-100 rounded-full p-0.5"
        aria-label="Remove filter"
      >
        <X size={14} />
      </button>
    </div>
  )
}
