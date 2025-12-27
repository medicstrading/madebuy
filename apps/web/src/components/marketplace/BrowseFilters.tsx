'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, Star } from 'lucide-react'
import { useState } from 'react'
import { MARKETPLACE_CATEGORIES } from '@madebuy/shared/src/types/marketplace'

export function BrowseFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '')

  const currentCategory = searchParams.get('category') || ''
  const currentMinRating = searchParams.get('minRating') || ''

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    router.push(`/marketplace/browse?${params.toString()}`)
  }

  const handlePriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (minPrice) {
      params.set('minPrice', minPrice)
    } else {
      params.delete('minPrice')
    }

    if (maxPrice) {
      params.set('maxPrice', maxPrice)
    } else {
      params.delete('maxPrice')
    }

    router.push(`/marketplace/browse?${params.toString()}`)
  }

  return (
    <div className="sticky top-24 space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 border-b pb-3">
        <SlidersHorizontal className="h-5 w-5 text-gray-600" />
        <h2 className="font-semibold text-gray-900">Filters</h2>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="mb-2 font-medium text-gray-900">Category</h3>
        <select
          value={currentCategory}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="mb-2 font-medium text-gray-900">Price Range</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
            />
          </div>
          <button
            onClick={handlePriceFilter}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Apply Price Filter
          </button>
        </div>
      </div>

      {/* Rating Filter */}
      <div>
        <h3 className="mb-2 font-medium text-gray-900">Minimum Rating</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <label key={rating} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="rating"
                value={rating}
                checked={currentMinRating === rating.toString()}
                onChange={(e) => handleFilterChange('minRating', e.target.value)}
                className="h-4 w-4 text-blue-600"
              />
              <div className="flex items-center gap-1">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="text-sm text-gray-600">& up</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
