'use client'

import {
  DollarSign,
  Eye,
  Hash,
  Minus,
  Package,
  Percent,
  Plus,
  Scale,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BulkEditAction, VariantQuickEditProps } from './types'

type EditTab = 'price' | 'stock' | 'availability' | 'sku' | 'weight'

interface TabConfig {
  id: EditTab
  label: string
  icon: typeof DollarSign
}

const TABS: TabConfig[] = [
  { id: 'price', label: 'Price', icon: DollarSign },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'availability', label: 'Availability', icon: Eye },
  { id: 'sku', label: 'SKU', icon: Hash },
  { id: 'weight', label: 'Weight', icon: Scale },
]

export function VariantQuickEdit({
  isOpen,
  onClose,
  selectedVariants,
  onApply,
  productCode = '',
}: VariantQuickEditProps) {
  const [activeTab, setActiveTab] = useState<EditTab>('price')
  const modalRef = useRef<HTMLDivElement>(null)

  // Price state
  const [priceMode, setPriceMode] = useState<'set' | 'adjust'>('set')
  const [priceValue, setPriceValue] = useState('')
  const [priceAdjustMode, setPriceAdjustMode] = useState<
    'add' | 'subtract' | 'percentage'
  >('add')

  // Stock state
  const [stockMode, setStockMode] = useState<'set' | 'adjust'>('set')
  const [stockValue, setStockValue] = useState('')
  const [stockAdjustMode, setStockAdjustMode] = useState<'add' | 'subtract'>(
    'add',
  )

  // Availability state
  const [availabilityValue, setAvailabilityValue] = useState(true)

  // SKU state
  const [skuPrefix, setSkuPrefix] = useState(productCode)

  // Weight state
  const [weightValue, setWeightValue] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPriceValue('')
      setStockValue('')
      setSkuPrefix(productCode)
      setWeightValue('')
      setActiveTab('price')
    }
  }, [isOpen, productCode])

  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Apply changes
  const handleApply = useCallback(() => {
    let action: BulkEditAction | null = null

    switch (activeTab) {
      case 'price': {
        const price = parseFloat(priceValue)
        if (!Number.isNaN(price)) {
          if (priceMode === 'set') {
            action = { type: 'setPrice', value: price }
          } else {
            action = {
              type: 'adjustPrice',
              value: price,
              mode: priceAdjustMode,
            }
          }
        }
        break
      }

      case 'stock': {
        const stock = parseInt(stockValue, 10)
        if (!Number.isNaN(stock)) {
          if (stockMode === 'set') {
            action = { type: 'setStock', value: stock }
          } else {
            action = {
              type: 'adjustStock',
              value: stock,
              mode: stockAdjustMode,
            }
          }
        }
        break
      }

      case 'availability':
        action = { type: 'setAvailability', value: availabilityValue }
        break

      case 'sku':
        if (skuPrefix.trim()) {
          action = { type: 'generateSkus', prefix: skuPrefix.trim() }
        }
        break

      case 'weight': {
        const weight = parseFloat(weightValue)
        if (!Number.isNaN(weight) && weight >= 0) {
          action = { type: 'setWeight', value: weight }
        }
        break
      }
    }

    if (action) {
      onApply(action)
      onClose()
    }
  }, [
    activeTab,
    priceMode,
    priceValue,
    priceAdjustMode,
    stockMode,
    stockValue,
    stockAdjustMode,
    availabilityValue,
    skuPrefix,
    weightValue,
    onApply,
    onClose,
  ])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-edit-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2
            id="quick-edit-title"
            className="text-lg font-semibold text-gray-900"
          >
            Bulk Edit {selectedVariants.length} Variant
            {selectedVariants.length !== 1 ? 's' : ''}
          </h2>
          <button
            type="button"
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                type="button"
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Price tab */}
          {activeTab === 'price' && (
            <div className="space-y-4">
              <div className="flex rounded-lg border border-gray-200 p-1">
                <button
                  type="button"
                  type="button"
                  onClick={() => setPriceMode('set')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    priceMode === 'set'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Set Price
                </button>
                <button
                  type="button"
                  type="button"
                  onClick={() => setPriceMode('adjust')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    priceMode === 'adjust'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Adjust Price
                </button>
              </div>

              {priceMode === 'adjust' && (
                <div className="flex rounded-lg border border-gray-200 p-1">
                  <button
                    type="button"
                    type="button"
                    onClick={() => setPriceAdjustMode('add')}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      priceAdjustMode === 'add'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                  <button
                    type="button"
                    type="button"
                    onClick={() => setPriceAdjustMode('subtract')}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      priceAdjustMode === 'subtract'
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    Subtract
                  </button>
                  <button
                    type="button"
                    type="button"
                    onClick={() => setPriceAdjustMode('percentage')}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      priceAdjustMode === 'percentage'
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Percent className="h-4 w-4" />
                    Percent
                  </button>
                </div>
              )}

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {priceAdjustMode === 'percentage' && priceMode === 'adjust'
                    ? '%'
                    : '$'}
                </span>
                <input
                  type="number"
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  placeholder={
                    priceMode === 'set' ? 'Enter price' : 'Enter amount'
                  }
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              <p className="text-sm text-gray-500">
                {priceMode === 'set'
                  ? 'Set the price for all selected variants'
                  : priceAdjustMode === 'percentage'
                    ? 'Adjust prices by percentage (positive = increase, negative = decrease)'
                    : priceAdjustMode === 'add'
                      ? 'Add this amount to current prices'
                      : 'Subtract this amount from current prices'}
              </p>
            </div>
          )}

          {/* Stock tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="flex rounded-lg border border-gray-200 p-1">
                <button
                  type="button"
                  type="button"
                  onClick={() => setStockMode('set')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    stockMode === 'set'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Set Stock
                </button>
                <button
                  type="button"
                  type="button"
                  onClick={() => setStockMode('adjust')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    stockMode === 'adjust'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Adjust Stock
                </button>
              </div>

              {stockMode === 'adjust' && (
                <div className="flex rounded-lg border border-gray-200 p-1">
                  <button
                    type="button"
                    type="button"
                    onClick={() => setStockAdjustMode('add')}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      stockAdjustMode === 'add'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Add Stock
                  </button>
                  <button
                    type="button"
                    type="button"
                    onClick={() => setStockAdjustMode('subtract')}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      stockAdjustMode === 'subtract'
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    Remove Stock
                  </button>
                </div>
              )}

              <input
                type="number"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                placeholder={
                  stockMode === 'set' ? 'Enter quantity' : 'Enter amount'
                }
                step="1"
                min="0"
                className="w-full rounded-lg border border-gray-300 py-2 px-3 text-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />

              <p className="text-sm text-gray-500">
                {stockMode === 'set'
                  ? 'Set the stock quantity for all selected variants'
                  : stockAdjustMode === 'add'
                    ? 'Add this quantity to current stock levels'
                    : 'Remove this quantity from current stock levels'}
              </p>
            </div>
          )}

          {/* Availability tab */}
          {activeTab === 'availability' && (
            <div className="space-y-4">
              <div className="flex rounded-lg border border-gray-200 p-1">
                <button
                  type="button"
                  type="button"
                  onClick={() => setAvailabilityValue(true)}
                  className={`flex-1 rounded-md py-3 text-sm font-medium transition-colors ${
                    availabilityValue
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Available
                </button>
                <button
                  type="button"
                  type="button"
                  onClick={() => setAvailabilityValue(false)}
                  className={`flex-1 rounded-md py-3 text-sm font-medium transition-colors ${
                    !availabilityValue
                      ? 'bg-gray-200 text-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Unavailable
                </button>
              </div>

              <p className="text-sm text-gray-500">
                {availabilityValue
                  ? 'Selected variants will be visible and purchasable'
                  : 'Selected variants will be hidden from customers'}
              </p>
            </div>
          )}

          {/* SKU tab */}
          {activeTab === 'sku' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="sku-prefix"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  SKU Prefix
                </label>
                <input
                  id="sku-prefix"
                  type="text"
                  value={skuPrefix}
                  onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())}
                  placeholder="Enter prefix (e.g., RING)"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 uppercase focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Preview:
                </p>
                <div className="space-y-1">
                  {selectedVariants.slice(0, 3).map((variant, index) => {
                    const optionParts = Object.values(variant.options)
                      .map((v) =>
                        v
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, '')
                          .substring(0, 4),
                      )
                      .join('-')
                    const preview = skuPrefix
                      ? `${skuPrefix}-${optionParts}-${String(index + 1).padStart(3, '0')}`
                      : `${optionParts}-${String(index + 1).padStart(3, '0')}`
                    return (
                      <code
                        key={variant.id}
                        className="block text-xs text-gray-600"
                      >
                        {preview}
                      </code>
                    )
                  })}
                  {selectedVariants.length > 3 && (
                    <p className="text-xs text-gray-500">
                      ...and {selectedVariants.length - 3} more
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500">
                Generate SKUs using the pattern: PREFIX-OPTION1-OPTION2-###
              </p>
            </div>
          )}

          {/* Weight tab */}
          {activeTab === 'weight' && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="number"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="Enter weight"
                  step="0.1"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 pr-8 text-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  g
                </span>
              </div>

              <p className="text-sm text-gray-500">
                Set the weight in grams for all selected variants. Used for
                shipping calculations.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply to {selectedVariants.length} Variant
            {selectedVariants.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
