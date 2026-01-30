'use client'

import type { Bundle } from '@madebuy/shared'
import {
  Archive,
  Edit,
  Eye,
  EyeOff,
  Package,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

function formatPrice(cents: number | undefined): string {
  if (cents === undefined) return '-'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function StatusBadge({ status }: { status: Bundle['status'] }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    archived: 'bg-amber-100 text-amber-800',
  }

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBundles()
  }, [fetchBundles])

  async function fetchBundles() {
    try {
      const res = await fetch('/api/bundles')
      const data = await res.json()
      setBundles(data.items || [])
    } catch (error) {
      console.error('Failed to fetch bundles:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: Bundle['status']) {
    try {
      await fetch(`/api/bundles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchBundles()
    } catch (error) {
      console.error('Failed to update bundle status:', error)
    }
  }

  async function deleteBundle(id: string) {
    if (!confirm('Are you sure you want to delete this bundle?')) return

    try {
      await fetch(`/api/bundles/${id}`, { method: 'DELETE' })
      fetchBundles()
    } catch (error) {
      console.error('Failed to delete bundle:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Bundles</h1>
          <p className="text-gray-500 mt-1">
            Create discounted bundles of multiple products
          </p>
        </div>
        <Link
          href="/dashboard/bundles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Bundle
        </Link>
      </div>

      {/* Bundle Grid */}
      {bundles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No bundles yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create product bundles to offer discounts on multiple items.
          </p>
          <Link
            href="/dashboard/bundles/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Bundle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Cover / Discount Badge */}
              <div className="h-24 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center relative">
                <Package className="h-10 w-10 text-purple-300" />
                {bundle.discountPercent > 0 && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-sm font-semibold">
                    <Percent className="h-3 w-3" />
                    {bundle.discountPercent}% OFF
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {bundle.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {bundle.pieces.length} product
                      {bundle.pieces.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <StatusBadge status={bundle.status} />
                </div>

                {/* Pricing */}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatPrice(bundle.bundlePrice)}
                  </span>
                  {bundle.originalPrice > bundle.bundlePrice && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(bundle.originalPrice)}
                    </span>
                  )}
                </div>

                {bundle.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {bundle.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/dashboard/bundles/${bundle.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  {bundle.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => updateStatus(bundle.id, 'draft')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Set to Draft"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  ) : bundle.status === 'draft' ? (
                    <button
                      type="button"
                      onClick={() => updateStatus(bundle.id, 'active')}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Activate"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  ) : null}
                  {bundle.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(bundle.id, 'archived')}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteBundle(bundle.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
