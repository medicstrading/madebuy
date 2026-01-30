'use client'

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { LOW_STOCK_DEFAULT_THRESHOLD, VARIANTS_PER_PAGE } from './constants'
import type { VariantMatrixProps } from './types'
import { VariantRow } from './VariantRow'

type SortField = 'options' | 'sku' | 'price' | 'stock'
type SortDirection = 'asc' | 'desc'

interface FilterState {
  search: string
  stockStatus: 'all' | 'in' | 'low' | 'out' | 'unavailable'
  priceRange: { min: number | null; max: number | null }
}

export function VariantMatrix({
  variants,
  attributes,
  selectedIds,
  onVariantChange,
  onSelectionChange,
  onDeleteVariants,
  errors,
  productImages = [],
  productCode = '',
  disabled = false,
}: VariantMatrixProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('options')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filtering state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    stockStatus: 'all',
    priceRange: { min: null, max: null },
  })
  const [_showFilters, _setShowFilters] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Filter variants
  const filteredVariants = useMemo(() => {
    return variants.filter((variant) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const optionValues = Object.values(variant.options)
          .join(' ')
          .toLowerCase()
        const skuMatch =
          variant.sku?.toLowerCase().includes(searchLower) || false
        if (!optionValues.includes(searchLower) && !skuMatch) {
          return false
        }
      }

      // Stock status filter
      if (filters.stockStatus !== 'all') {
        const stock = variant.stock
        const isAvailable = variant.isAvailable
        const threshold =
          variant.lowStockThreshold || LOW_STOCK_DEFAULT_THRESHOLD

        switch (filters.stockStatus) {
          case 'in':
            if (!isAvailable || stock === undefined || stock <= threshold)
              return false
            break
          case 'low':
            if (
              !isAvailable ||
              stock === undefined ||
              stock === 0 ||
              stock > threshold
            )
              return false
            break
          case 'out':
            if (!isAvailable || stock !== 0) return false
            break
          case 'unavailable':
            if (isAvailable) return false
            break
        }
      }

      // Price range filter
      if (
        filters.priceRange.min !== null &&
        (variant.price === undefined || variant.price < filters.priceRange.min)
      ) {
        return false
      }
      if (
        filters.priceRange.max !== null &&
        (variant.price === undefined || variant.price > filters.priceRange.max)
      ) {
        return false
      }

      return true
    })
  }, [variants, filters])

  // Sort variants
  const sortedVariants = useMemo(() => {
    return [...filteredVariants].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'options': {
          const aName = attributes
            .map((attr) => a.options[attr.name])
            .filter(Boolean)
            .join(' ')
          const bName = attributes
            .map((attr) => b.options[attr.name])
            .filter(Boolean)
            .join(' ')
          comparison = aName.localeCompare(bName)
          break
        }
        case 'sku':
          comparison = (a.sku || '').localeCompare(b.sku || '')
          break
        case 'price':
          comparison = (a.price || 0) - (b.price || 0)
          break
        case 'stock':
          comparison = (a.stock ?? Infinity) - (b.stock ?? Infinity)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredVariants, sortField, sortDirection, attributes])

  // Paginate variants
  const totalPages = Math.ceil(sortedVariants.length / VARIANTS_PER_PAGE)
  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * VARIANTS_PER_PAGE
    return sortedVariants.slice(start, start + VARIANTS_PER_PAGE)
  }, [sortedVariants, currentPage])

  // Handle sort
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection('asc')
      }
    },
    [sortField],
  )

  // Handle select all (only visible variants)
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const newSelected = new Set(selectedIds)
        paginatedVariants.forEach((v) => newSelected.add(v.id))
        onSelectionChange(newSelected)
      } else {
        const newSelected = new Set(selectedIds)
        paginatedVariants.forEach((v) => newSelected.delete(v.id))
        onSelectionChange(newSelected)
      }
    },
    [selectedIds, paginatedVariants, onSelectionChange],
  )

  // Check if all visible variants are selected
  const allVisibleSelected =
    paginatedVariants.length > 0 &&
    paginatedVariants.every((v) => selectedIds.has(v.id))
  const someVisibleSelected =
    paginatedVariants.some((v) => selectedIds.has(v.id)) && !allVisibleSelected

  // Handle delete selected
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    if (window.confirm(`Delete ${selectedIds.size} selected variant(s)?`)) {
      onDeleteVariants(Array.from(selectedIds))
    }
  }, [selectedIds, onDeleteVariants])

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      stockStatus: 'all',
      priceRange: { min: null, max: null },
    })
    setCurrentPage(1)
  }, [])

  // Sort header component
  const SortHeader = ({
    field,
    children,
    className = '',
  }: {
    field: SortField
    children: React.ReactNode
    className?: string
  }) => (
    <button
            
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 ${className}`}
    >
      {children}
      {sortField === field &&
        (sortDirection === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        ))}
    </button>
  )

  if (variants.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <RefreshCw className="mx-auto h-8 w-8 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No variants yet
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Add attributes above and click &ldquo;Generate Variants&rdquo; to
          create variant combinations.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }))
              setCurrentPage(1)
            }}
            placeholder="Search variants..."
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Filter toggle and actions */}
        <div className="flex items-center gap-2">
          {/* Quick stock filters */}
          <select
            value={filters.stockStatus}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                stockStatus: e.target.value as FilterState['stockStatus'],
              }))
              setCurrentPage(1)
            }}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">All Stock Status</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
            <option value="unavailable">Unavailable</option>
          </select>

          {/* Selection info and bulk delete */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5">
              <span className="text-sm font-medium text-blue-700">
                {selectedIds.size} selected
              </span>
              <button
                                
                onClick={handleDeleteSelected}
                disabled={disabled}
                className="rounded p-1 text-blue-700 hover:bg-blue-100"
                aria-label="Delete selected"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Clear filters */}
          {(filters.search ||
            filters.stockStatus !== 'all' ||
            filters.priceRange.min !== null ||
            filters.priceRange.max !== null) && (
            <button
                            
              onClick={handleClearFilters}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500">
        Showing {paginatedVariants.length} of {filteredVariants.length} variants
        {filteredVariants.length !== variants.length && (
          <span> (filtered from {variants.length} total)</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-2 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Select all visible variants"
                />
              </th>
              <th className="w-12 px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Image
              </th>
              <th className="px-3 py-3 text-left">
                <SortHeader field="options">Variant</SortHeader>
              </th>
              <th className="w-32 px-2 py-3 text-left">
                <SortHeader field="sku">SKU</SortHeader>
              </th>
              <th className="w-28 px-2 py-3 text-left">
                <SortHeader field="price">Price</SortHeader>
              </th>
              <th className="w-28 px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Compare At
              </th>
              <th className="w-24 px-2 py-3 text-left">
                <SortHeader field="stock">Stock</SortHeader>
              </th>
              <th className="w-20 px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Weight
              </th>
              <th className="w-16 px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="w-16 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {paginatedVariants.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                attributes={attributes}
                isSelected={selectedIds.has(variant.id)}
                onSelect={(selected) => {
                  const newSelected = new Set(selectedIds)
                  if (selected) {
                    newSelected.add(variant.id)
                  } else {
                    newSelected.delete(variant.id)
                  }
                  onSelectionChange(newSelected)
                }}
                onChange={(updates) => onVariantChange(variant.id, updates)}
                onDelete={() => onDeleteVariants([variant.id])}
                error={errors.get(variant.id)}
                productImages={productImages}
                disabled={disabled}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
                            
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="First page"
            >
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="-ml-2 h-4 w-4" />
            </button>
            <button
                            
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    type="button"
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
                            
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
                            
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Last page"
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="-ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
