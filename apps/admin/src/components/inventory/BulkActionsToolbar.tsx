'use client'

import type { PieceStatus } from '@madebuy/shared'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  DollarSign,
  FileEdit,
  Globe,
  Package,
  RefreshCw,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

interface BulkActionsToolbarProps {
  selectedIds: Set<string>
  onClearSelection: () => void
  onActionComplete: () => void
}

type BulkOperation =
  | 'updateStatus'
  | 'delete'
  | 'updatePrices'
  | 'updateStock'
  | 'setFeatured'
  | 'setPublished'
  | 'addTags'
  | 'removeTags'

type ActiveModal =
  | null
  | 'status'
  | 'delete'
  | 'price'
  | 'stock'
  | 'featured'
  | 'published'
  | 'tags'

const STATUS_OPTIONS: { value: PieceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'available', label: 'Available' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
]

export function BulkActionsToolbar({
  selectedIds,
  onClearSelection,
  onActionComplete,
}: BulkActionsToolbarProps) {
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal form states
  const [selectedStatus, setSelectedStatus] = useState<PieceStatus>('available')
  const [priceType, setPriceType] = useState<'percentage' | 'fixed'>(
    'percentage',
  )
  const [priceDirection, setPriceDirection] = useState<'increase' | 'decrease'>(
    'increase',
  )
  const [priceValue, setPriceValue] = useState('')
  const [stockValue, setStockValue] = useState('')
  const [stockUnlimited, setStockUnlimited] = useState(false)
  const [featuredValue, setFeaturedValue] = useState(true)
  const [publishedValue, setPublishedValue] = useState(true)
  const [tagsInput, setTagsInput] = useState('')
  const [tagsAction, setTagsAction] = useState<'add' | 'remove'>('add')

  const selectedCount = selectedIds.size

  const executeBulkAction = useCallback(
    async (operation: BulkOperation, params?: Record<string, unknown>) => {
      setIsSubmitting(true)
      setError(null)

      try {
        const response = await fetch('/api/pieces/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation,
            pieceIds: Array.from(selectedIds),
            params,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Bulk operation failed')
        }

        // Success - close modal and refresh
        setActiveModal(null)
        onActionComplete()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Operation failed')
      } finally {
        setIsSubmitting(false)
      }
    },
    [selectedIds, onActionComplete, router],
  )

  const handleStatusChange = () => {
    executeBulkAction('updateStatus', { status: selectedStatus })
  }

  const handleDelete = () => {
    executeBulkAction('delete')
  }

  const handlePriceChange = () => {
    const value = parseFloat(priceValue)
    if (Number.isNaN(value) || value <= 0) {
      setError('Please enter a valid positive number')
      return
    }
    executeBulkAction('updatePrices', {
      type: priceType,
      direction: priceDirection,
      value,
    })
  }

  const handleStockChange = () => {
    if (stockUnlimited) {
      executeBulkAction('updateStock', { stock: 'unlimited' })
    } else {
      const value = parseInt(stockValue, 10)
      if (Number.isNaN(value) || value < 0) {
        setError('Please enter a valid stock number')
        return
      }
      executeBulkAction('updateStock', { stock: value })
    }
  }

  const handleFeaturedChange = () => {
    executeBulkAction('setFeatured', { isFeatured: featuredValue })
  }

  const handlePublishedChange = () => {
    executeBulkAction('setPublished', { isPublished: publishedValue })
  }

  const handleTagsChange = () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (tags.length === 0) {
      setError('Please enter at least one tag')
      return
    }
    executeBulkAction(tagsAction === 'add' ? 'addTags' : 'removeTags', { tags })
  }

  const openModal = (modal: ActiveModal) => {
    setShowDropdown(false)
    setError(null)
    setActiveModal(modal)
  }

  const closeModal = () => {
    setActiveModal(null)
    setError(null)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2 border border-blue-200">
        <span className="text-sm font-medium text-blue-800">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <button
          type="button"
          onClick={onClearSelection}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Clear
        </button>

        <div className="h-4 w-px bg-blue-200" />

        {/* Bulk Actions Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Bulk Actions
            <ChevronDown className="h-4 w-4" />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute left-0 z-20 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <DropdownItem
                    icon={FileEdit}
                    label="Change Status"
                    onClick={() => openModal('status')}
                  />
                  <DropdownItem
                    icon={DollarSign}
                    label="Update Prices"
                    onClick={() => openModal('price')}
                  />
                  <DropdownItem
                    icon={Package}
                    label="Update Stock"
                    onClick={() => openModal('stock')}
                  />
                  <DropdownItem
                    icon={Star}
                    label="Set Featured"
                    onClick={() => openModal('featured')}
                  />
                  <DropdownItem
                    icon={Globe}
                    label="Set Published"
                    onClick={() => openModal('published')}
                  />
                  <DropdownItem
                    icon={Tag}
                    label="Manage Tags"
                    onClick={() => openModal('tags')}
                  />
                  <div className="my-1 border-t border-gray-100" />
                  <DropdownItem
                    icon={Trash2}
                    label="Delete Selected"
                    onClick={() => openModal('delete')}
                    destructive
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Modal */}
      {activeModal === 'status' && (
        <Modal title="Change Status" onClose={closeModal}>
          <p className="text-sm text-gray-600 mb-4">
            Update status for {selectedCount} piece
            {selectedCount !== 1 ? 's' : ''}.
          </p>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as PieceStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <ErrorMessage message={error} />}
          <ModalActions
            onCancel={closeModal}
            onConfirm={handleStatusChange}
            isSubmitting={isSubmitting}
            confirmLabel="Update Status"
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {activeModal === 'delete' && (
        <Modal title="Delete Pieces" onClose={closeModal}>
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">
                Delete {selectedCount} piece{selectedCount !== 1 ? 's' : ''}?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone. All associated media will be
                unlinked.
              </p>
            </div>
          </div>
          {error && <ErrorMessage message={error} />}
          <ModalActions
            onCancel={closeModal}
            onConfirm={handleDelete}
            isSubmitting={isSubmitting}
            confirmLabel="Delete"
            destructive
          />
        </Modal>
      )}

      {/* Price Modal */}
      {activeModal === 'price' && (
        <Modal title="Update Prices" onClose={closeModal}>
          <p className="text-sm text-gray-600 mb-4">
            Adjust prices for {selectedCount} piece
            {selectedCount !== 1 ? 's' : ''}.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={priceType}
                  onChange={(e) =>
                    setPriceType(e.target.value as 'percentage' | 'fixed')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Direction
                </label>
                <select
                  value={priceDirection}
                  onChange={(e) =>
                    setPriceDirection(e.target.value as 'increase' | 'decrease')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="increase">Increase</option>
                  <option value="decrease">Decrease</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="number"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder={
                  priceType === 'percentage' ? 'e.g., 10' : 'e.g., 5.00'
                }
                min="0"
                step={priceType === 'percentage' ? '1' : '0.01'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <ErrorMessage message={error} />}
          <ModalActions
            onCancel={closeModal}
            onConfirm={handlePriceChange}
            isSubmitting={isSubmitting}
            confirmLabel="Update Prices"
          />
        </Modal>
      )}

      {/* Stock Modal */}
      {activeModal === 'stock' && (
        <Modal title="Update Stock" onClose={closeModal}>
          <p className="text-sm text-gray-600 mb-4">
            Set stock level for {selectedCount} piece
            {selectedCount !== 1 ? 's' : ''}.
          </p>
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={stockUnlimited}
                onChange={(e) => setStockUnlimited(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Unlimited stock</span>
            </label>
            {!stockUnlimited && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  placeholder="e.g., 10"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
          {error && <ErrorMessage message={error} />}
          <ModalActions
            onCancel={closeModal}
            onConfirm={handleStockChange}
            isSubmitting={isSubmitting}
            confirmLabel="Update Stock"
          />
        </Modal>
      )}

      {/* Featured Modal */}
      {activeModal === 'featured' && (
        <Modal title="Set Featured" onClose={closeModal}>
          <p className="text-sm text-gray-600 mb-4">
            Update featured status for {selectedCount} piece
            {selectedCount !== 1 ? 's' : ''}.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="featured"
                checked={featuredValue === true}
                onChange={() => setFeaturedValue(true)}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Mark as Featured</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="featured"
                checked={featuredValue === false}
                onChange={() => setFeaturedValue(false)}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Remove Featured</span>
            </label>
          </div>
          {error && <ErrorMessage message={error} />}
          <ModalActions
            onCancel={closeModal}
            onConfirm={handleFeaturedChange}
            isSubmitting={isSubmitting}
            confirmLabel="Update"
          />
        </Modal>
      )}

      {/* Published Modal */}
      {activeModal === 'published' && (
        <Modal title="Set Published" onClose={closeModal}>
          <p className="text-sm text-gray-600 mb-4">
            Update website visibility for {selectedCount} piece
            {selectedCount !== 1 ? 's' : ''}.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="published"
                checked={publishedValue === true}
                onChange={() => setPublishedValue(true)}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Publish to Website</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="published"
                checked={publishedValue === false}
                onChange={() => setPublishedValue(false)}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Unpublish from Website
              </span>
            </label>
          </div>
          {error && <ErrorMessage message={error} />}
          <ModalActions
            onCancel={closeModal}
            onConfirm={handlePublishedChange}
            isSubmitting={isSubmitting}
            confirmLabel="Update"
          />
        </Modal>
      )}

      {/* Tags Modal */}
      {activeModal === 'tags' && (
        <Modal title="Manage Tags" onClose={closeModal}>
          <p className="text-sm text-gray-600 mb-4">
            Add or remove tags for {selectedCount} piece
            {selectedCount !== 1 ? 's' : ''}.
          </p>
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tagsAction"
                  checked={tagsAction === 'add'}
                  onChange={() => setTagsAction('add')}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Add Tags</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tagsAction"
                  checked={tagsAction === 'remove'}
                  onChange={() => setTagsAction('remove')}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Remove Tags</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., sale, new, featured"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <ErrorMessage message={error} />}
          <ModalActions
            onCancel={closeModal}
            onConfirm={handleTagsChange}
            isSubmitting={isSubmitting}
            confirmLabel={tagsAction === 'add' ? 'Add Tags' : 'Remove Tags'}
          />
        </Modal>
      )}
    </>
  )
}

// Helper Components

function DropdownItem({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: typeof Check
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 ${
        destructive ? 'text-red-600' : 'text-gray-700'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({
  onCancel,
  onConfirm,
  isSubmitting,
  confirmLabel,
  destructive = false,
}: {
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
  confirmLabel: string
  destructive?: boolean
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isSubmitting}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
          destructive
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            {confirmLabel}
          </>
        )}
      </button>
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
      <AlertTriangle className="h-4 w-4" />
      {message}
    </p>
  )
}
