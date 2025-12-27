'use client'

import { useState } from 'react'
import { Store, CheckCircle, AlertCircle } from 'lucide-react'
import type { Tenant } from '@madebuy/shared'
import { canAccessMarketplace } from '@/lib/marketplace'

interface MarketplaceToggleProps {
  productId: string
  productName: string
  isListed: boolean
  categories?: string[]
  tenant: Tenant
  onToggle?: (listed: boolean) => void
}

export function MarketplaceToggle({
  productId,
  productName,
  isListed,
  categories = [],
  tenant,
  onToggle,
}: MarketplaceToggleProps) {
  const [loading, setLoading] = useState(false)
  const [listed, setListed] = useState(isListed)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories)
  const [showModal, setShowModal] = useState(false)

  const hasAccess = canAccessMarketplace(tenant)

  const handleToggle = async () => {
    if (!hasAccess) {
      // Redirect to upgrade page
      window.location.href = '/dashboard/marketplace'
      return
    }

    if (!listed) {
      // Show category selection modal
      setShowModal(true)
      return
    }

    // Remove from marketplace
    await updateListing(false)
  }

  const updateListing = async (newListedState: boolean) => {
    setLoading(true)

    try {
      const response = await fetch('/api/marketplace/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          listed: newListedState,
          categories: newListedState ? selectedCategories : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update marketplace listing')
      }

      setListed(newListedState)
      setShowModal(false)
      onToggle?.(newListedState)
    } catch (error) {
      console.error('Error toggling marketplace listing:', error)
      alert('Failed to update marketplace listing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          listed
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : hasAccess
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {listed ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Listed in Marketplace
          </>
        ) : hasAccess ? (
          <>
            <Store className="h-4 w-4" />
            List in Marketplace
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4" />
            Upgrade to List
          </>
        )}
      </button>

      {/* Category Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold text-gray-900">
              List &quot;{productName}&quot; in Marketplace
            </h3>

            <p className="mb-4 text-sm text-gray-600">
              Select one or more categories where this product should appear:
            </p>

            <div className="mb-6 space-y-2">
              {[
                { id: 'jewelry', name: 'Jewelry & Accessories' },
                { id: 'art-prints', name: 'Art & Prints' },
                { id: 'clothing', name: 'Clothing & Apparel' },
                { id: 'home-decor', name: 'Home & Living' },
                { id: 'crafts', name: 'Crafts & Stationery' },
              ].map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategories([...selectedCategories, category.id])
                      } else {
                        setSelectedCategories(selectedCategories.filter((c) => c !== category.id))
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{category.name}</span>
                </label>
              ))}
            </div>

            {selectedCategories.length === 0 && (
              <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                Please select at least one category
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => updateListing(true)}
                disabled={loading || selectedCategories.length === 0}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Listing...' : 'List Product'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Your product will be submitted for approval and appear in the marketplace within 24 hours.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
