'use client'

import type { DiscountCode, DiscountType } from '@madebuy/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DiscountFormProps {
  discount?: DiscountCode
}

// Form state type - uses string for datetime-local inputs
interface DiscountFormState {
  code: string
  description?: string
  type: DiscountType
  value: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  maxUses?: number
  maxUsesPerCustomer?: number
  startsAt?: string // datetime-local string format
  expiresAt?: string // datetime-local string format
  isActive: boolean
}

export function DiscountForm({ discount }: DiscountFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<DiscountFormState>({
    code: discount?.code || '',
    description: discount?.description || '',
    type: discount?.type || 'percentage',
    value: discount?.value || 10,
    minOrderAmount: discount?.minOrderAmount,
    maxDiscountAmount: discount?.maxDiscountAmount,
    maxUses: discount?.maxUses,
    maxUsesPerCustomer: discount?.maxUsesPerCustomer,
    startsAt: discount?.startsAt
      ? new Date(discount.startsAt).toISOString().slice(0, 16)
      : undefined,
    expiresAt: discount?.expiresAt
      ? new Date(discount.expiresAt).toISOString().slice(0, 16)
      : undefined,
    isActive: discount?.isActive ?? true,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        ...formData,
        startsAt: formData.startsAt ? new Date(formData.startsAt) : undefined,
        expiresAt: formData.expiresAt
          ? new Date(formData.expiresAt)
          : undefined,
      }

      const res = await fetch(
        discount ? `/api/discounts/${discount.id}` : '/api/discounts',
        {
          method: discount ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save discount')
      }

      router.push('/dashboard/discounts')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Discount Details
        </h2>

        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discount Code *
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value.toUpperCase() })
            }
            placeholder="e.g., SUMMER20"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Customers will enter this code at checkout
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="e.g., Summer sale 20% off"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Type and Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as DiscountType,
                })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}{' '}
              *
            </label>
            <input
              type="number"
              value={formData.value}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  value: parseFloat(e.target.value) || 0,
                })
              }
              min={0}
              max={formData.type === 'percentage' ? 100 : undefined}
              step={formData.type === 'percentage' ? 1 : 0.01}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={formData.type === 'free_shipping'}
              required={formData.type !== 'free_shipping'}
            />
          </div>
        </div>

        {/* Min Order & Max Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Order Amount ($)
            </label>
            <input
              type="number"
              value={formData.minOrderAmount || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minOrderAmount: parseFloat(e.target.value) || undefined,
                })
              }
              min={0}
              step={0.01}
              placeholder="No minimum"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {formData.type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Discount ($)
              </label>
              <input
                type="number"
                value={formData.maxDiscountAmount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDiscountAmount: parseFloat(e.target.value) || undefined,
                  })
                }
                min={0}
                step={0.01}
                placeholder="No cap"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Usage Limits */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Usage Limits</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Uses Limit
            </label>
            <input
              type="number"
              value={formData.maxUses || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxUses: parseInt(e.target.value, 10) || undefined,
                })
              }
              min={1}
              placeholder="Unlimited"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uses Per Customer
            </label>
            <input
              type="number"
              value={formData.maxUsesPerCustomer || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxUsesPerCustomer: parseInt(e.target.value, 10) || undefined,
                })
              }
              min={1}
              placeholder="Unlimited"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Validity Period */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Validity Period</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="datetime-local"
              value={formData.startsAt || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startsAt: e.target.value || undefined,
                })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="datetime-local"
              value={formData.expiresAt || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expiresAt: e.target.value || undefined,
                })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="isActive"
            className="text-sm font-medium text-gray-700"
          >
            Discount is active and can be used by customers
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? 'Saving...'
            : discount
              ? 'Update Discount'
              : 'Create Discount'}
        </button>
      </div>
    </form>
  )
}
