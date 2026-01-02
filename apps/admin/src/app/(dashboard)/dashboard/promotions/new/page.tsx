'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Tag, Percent, DollarSign, Truck } from 'lucide-react'

export default function NewPromotionPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percentage' | 'fixed_amount' | 'free_shipping'>('percentage')
  const [value, setValue] = useState<number>(10)
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<string>('')
  const [maxUses, setMaxUses] = useState<string>('')
  // Initialize empty to prevent hydration mismatch, set in useEffect
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Set today's date after mount to prevent hydration mismatch
  useEffect(() => {
    setStartDate(new Date().toISOString().split('T')[0])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter a promotion name')
      return
    }

    if (type !== 'free_shipping' && (!value || value <= 0)) {
      setError('Please enter a valid discount value')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name,
        code: code.trim() || undefined,
        type,
        value: type === 'free_shipping' ? 0 : value,
        minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) * 100 : undefined,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        isActive,
      }

      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create promotion')
      }

      router.push('/dashboard/promotions')
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to create promotion. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCode(result)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/promotions"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Promotions
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Promotion</h1>
        <p className="mt-2 text-gray-600">Set up a new discount code or campaign</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Summer Sale 20% Off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g., SUMMER20"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  Generate
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty for automatic promotions
              </p>
            </div>
          </div>
        </div>

        {/* Discount Type */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Discount Type</h2>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <button
              type="button"
              onClick={() => setType('percentage')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                type === 'percentage'
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Percent className="h-6 w-6" />
              <span className="text-sm font-medium">Percentage</span>
            </button>
            <button
              type="button"
              onClick={() => setType('fixed_amount')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                type === 'fixed_amount'
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <DollarSign className="h-6 w-6" />
              <span className="text-sm font-medium">Fixed Amount</span>
            </button>
            <button
              type="button"
              onClick={() => setType('free_shipping')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                type === 'free_shipping'
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Truck className="h-6 w-6" />
              <span className="text-sm font-medium">Free Shipping</span>
            </button>
          </div>

          {type !== 'free_shipping' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {type === 'percentage' ? 'Discount Percentage' : 'Discount Amount (AUD)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(parseFloat(e.target.value))}
                  min={type === 'percentage' ? 1 : 0.01}
                  max={type === 'percentage' ? 100 : undefined}
                  step={type === 'percentage' ? 1 : 0.01}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {type === 'percentage' ? '%' : 'AUD'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Conditions */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Purchase (AUD)
              </label>
              <input
                type="number"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                placeholder="No minimum"
                min={0}
                step={0.01}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Uses
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Validity */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Validity Period</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">Leave empty for no end date</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Activate immediately
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/promotions"
            className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Creating...' : 'Create Promotion'}
          </button>
        </div>
      </form>
    </div>
  )
}
