'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import {
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react'
import type { VariantRowProps, EditableVariant } from './types'
import type { MediaItem } from '@madebuy/shared'
import { LOW_STOCK_DEFAULT_THRESHOLD } from './constants'

interface EditableCellProps {
  value: string | number | undefined
  onChange: (value: string | number | undefined) => void
  type: 'text' | 'number' | 'currency'
  placeholder?: string
  error?: string
  disabled?: boolean
  onBlur?: () => void
  className?: string
}

function EditableCell({
  value,
  onChange,
  type,
  placeholder,
  error,
  disabled,
  onBlur,
  className = '',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value?.toString() || '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value?.toString() || '')
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(() => {
    setIsEditing(false)
    let newValue: string | number | undefined

    if (localValue.trim() === '') {
      newValue = undefined
    } else if (type === 'number' || type === 'currency') {
      const parsed = parseFloat(localValue)
      newValue = isNaN(parsed) ? undefined : parsed
    } else {
      newValue = localValue.trim()
    }

    onChange(newValue)
    onBlur?.()
  }, [localValue, onChange, onBlur, type])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setLocalValue(value?.toString() || '')
        setIsEditing(false)
      } else if (e.key === 'Tab') {
        handleSave()
      }
    },
    [handleSave, value]
  )

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={type === 'currency' ? 'number' : type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          step={type === 'currency' ? '0.01' : type === 'number' ? '1' : undefined}
          min={type === 'number' || type === 'currency' ? '0' : undefined}
          className={`w-full rounded border px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white'
          } ${className}`}
        />
        {error && (
          <div className="absolute -bottom-5 left-0 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>
    )
  }

  const displayValue =
    type === 'currency' && value !== undefined
      ? `$${Number(value).toFixed(2)}`
      : value?.toString() || ''

  return (
    <button
      type="button"
      onClick={() => !disabled && setIsEditing(true)}
      disabled={disabled}
      className={`w-full rounded px-2 py-1 text-left text-sm transition-colors ${
        error
          ? 'bg-red-50 text-red-900 hover:bg-red-100'
          : displayValue
          ? 'text-gray-900 hover:bg-gray-100'
          : 'text-gray-400 hover:bg-gray-100'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      {displayValue || placeholder}
    </button>
  )
}

interface ImageSelectorProps {
  selectedImageId?: string
  images: MediaItem[]
  onSelect: (imageId: string | undefined) => void
  disabled?: boolean
}

/**
 * Get the display URL for a MediaItem
 * Prefers thumbnail, falls back to original
 */
function getImageUrl(image: MediaItem): string {
  return image.variants.thumb?.url || image.variants.original?.url || ''
}

function ImageSelector({
  selectedImageId,
  images,
  onSelect,
  disabled,
}: ImageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedImage = images.find((img) => img.id === selectedImageId)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (images.length === 0) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-gray-400">
        <ImageIcon className="h-4 w-4" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded border transition-colors ${
          selectedImage
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        aria-label="Select image"
      >
        {selectedImage ? (
          <img
            src={getImageUrl(selectedImage)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => {
                onSelect(undefined)
                setIsOpen(false)
              }}
              className={`flex h-10 w-10 items-center justify-center rounded border ${
                !selectedImageId
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  onSelect(image.id)
                  setIsOpen(false)
                }}
                className={`h-10 w-10 overflow-hidden rounded border ${
                  selectedImageId === image.id
                    ? 'border-blue-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={getImageUrl(image)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function VariantRow({
  variant,
  attributes,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  error,
  productImages = [],
  disabled = false,
}: VariantRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Determine stock status
  const stockStatus = (() => {
    if (!variant.isAvailable) return 'unavailable'
    if (variant.stock === undefined) return 'unlimited'
    if (variant.stock === 0) return 'out'
    if (variant.stock <= (variant.lowStockThreshold || LOW_STOCK_DEFAULT_THRESHOLD)) {
      return 'low'
    }
    return 'in'
  })()

  const stockStatusColors = {
    in: 'bg-green-50 text-green-700',
    low: 'bg-yellow-50 text-yellow-700',
    out: 'bg-red-50 text-red-700',
    unavailable: 'bg-gray-100 text-gray-500',
    unlimited: 'bg-blue-50 text-blue-700',
  }

  // Build variant name from options
  const variantName = attributes
    .map((attr) => variant.options[attr.name])
    .filter(Boolean)
    .join(' / ')

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete()
    } else {
      setShowDeleteConfirm(true)
    }
  }, [showDeleteConfirm, onDelete])

  return (
    <tr
      className={`group border-b border-gray-100 transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      } ${error ? 'bg-red-50' : ''}`}
    >
      {/* Checkbox */}
      <td className="w-10 px-2 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Select ${variantName}`}
        />
      </td>

      {/* Image */}
      <td className="w-12 px-2 py-2">
        <ImageSelector
          selectedImageId={variant.mediaId}
          images={productImages}
          onSelect={(mediaId) => onChange({ mediaId })}
          disabled={disabled}
        />
      </td>

      {/* Variant name (options) */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{variantName}</span>
          {error && (
            <div className="group/error relative">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="absolute bottom-full left-0 mb-1 hidden w-48 rounded bg-red-600 px-2 py-1 text-xs text-white group-hover/error:block">
                {error}
              </div>
            </div>
          )}
        </div>
      </td>

      {/* SKU */}
      <td className="w-32 px-2 py-2">
        <EditableCell
          value={variant.sku}
          onChange={(value) => onChange({ sku: value as string | undefined })}
          type="text"
          placeholder="SKU"
          disabled={disabled}
        />
      </td>

      {/* Price */}
      <td className="w-28 px-2 py-2">
        <EditableCell
          value={variant.price}
          onChange={(value) =>
            onChange({ price: value as number | undefined })
          }
          type="currency"
          placeholder="$0.00"
          disabled={disabled}
        />
      </td>

      {/* Compare at Price */}
      <td className="w-28 px-2 py-2">
        <EditableCell
          value={variant.compareAtPrice}
          onChange={(value) =>
            onChange({ compareAtPrice: value as number | undefined })
          }
          type="currency"
          placeholder="$0.00"
          disabled={disabled}
        />
      </td>

      {/* Stock */}
      <td className="w-24 px-2 py-2">
        <div className="flex items-center gap-1">
          <EditableCell
            value={variant.stock}
            onChange={(value) =>
              onChange({ stock: value as number | undefined })
            }
            type="number"
            placeholder="-"
            disabled={disabled}
            className="w-16"
          />
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${stockStatusColors[stockStatus]}`}
          >
            {stockStatus === 'unlimited'
              ? 'Unlim'
              : stockStatus === 'out'
              ? 'Out'
              : stockStatus === 'low'
              ? 'Low'
              : stockStatus === 'unavailable'
              ? 'Off'
              : ''}
          </span>
        </div>
      </td>

      {/* Weight */}
      <td className="w-20 px-2 py-2">
        <EditableCell
          value={variant.weight}
          onChange={(value) =>
            onChange({ weight: value as number | undefined })
          }
          type="number"
          placeholder="g"
          disabled={disabled}
        />
      </td>

      {/* Availability toggle */}
      <td className="w-16 px-2 py-2">
        <button
          type="button"
          onClick={() => onChange({ isAvailable: !variant.isAvailable })}
          disabled={disabled}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
            variant.isAvailable
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label={variant.isAvailable ? 'Available' : 'Unavailable'}
          title={variant.isAvailable ? 'Click to hide' : 'Click to show'}
        >
          {variant.isAvailable ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
      </td>

      {/* Actions */}
      <td className="w-16 px-2 py-2">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded bg-red-600 p-1 text-white hover:bg-red-700"
              aria-label="Confirm delete"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded bg-gray-200 p-1 text-gray-600 hover:bg-gray-300"
              aria-label="Cancel delete"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            disabled={disabled}
            className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
            aria-label="Delete variant"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  )
}
