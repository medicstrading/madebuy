'use client'

import { useState, useEffect } from 'react'
import { Loader2, Settings, Palette, Package, Boxes } from 'lucide-react'
import { MakerTypeSelector } from '@/components/settings/MakerTypeSelector'
import { CategoryManager } from '@/components/settings/CategoryManager'
import type { Tenant, MakerType } from '@madebuy/shared/src/types/tenant'
import {
  MAKER_CATEGORY_PRESETS,
  MAKER_MATERIAL_PRESETS,
} from '@madebuy/shared/src/constants/makerPresets'

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Load tenant data
  useEffect(() => {
    async function loadTenant() {
      try {
        const response = await fetch('/api/tenant')
        if (response.ok) {
          const data = await response.json()
          setTenant(data)
        } else {
          setError('Failed to load settings')
        }
      } catch (err) {
        setError('Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }
    loadTenant()
  }, [])

  // Save maker type
  const handleMakerTypeChange = async (makerType: MakerType) => {
    if (!tenant) return
    setSaveStatus('saving')
    try {
      const response = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makerType }),
      })
      if (response.ok) {
        setTenant((prev) => (prev ? { ...prev, makerType } : prev))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        throw new Error('Failed to save')
      }
    } catch (err) {
      setError('Failed to save maker type')
      setSaveStatus('idle')
    }
  }

  // Add custom category
  const handleAddCategory = async (category: string, type: 'product' | 'material') => {
    if (!tenant) return
    setSaveStatus('saving')
    try {
      const field = type === 'product' ? 'customCategories' : 'customMaterialCategories'
      const current = tenant[field] || []
      const updated = [...current, category]

      const response = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updated }),
      })
      if (response.ok) {
        setTenant((prev) => (prev ? { ...prev, [field]: updated } : prev))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        throw new Error('Failed to save')
      }
    } catch (err) {
      throw err
    }
  }

  // Remove custom category
  const handleRemoveCategory = async (category: string, type: 'product' | 'material') => {
    if (!tenant) return
    setSaveStatus('saving')
    try {
      const field = type === 'product' ? 'customCategories' : 'customMaterialCategories'
      const current = tenant[field] || []
      const updated = current.filter((c) => c !== category)

      const response = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updated }),
      })
      if (response.ok) {
        setTenant((prev) => (prev ? { ...prev, [field]: updated } : prev))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        throw new Error('Failed to save')
      }
    } catch (err) {
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error || 'Failed to load settings'}</p>
      </div>
    )
  }

  // Get preset categories based on maker type
  const presetProductCategories = tenant.makerType
    ? MAKER_CATEGORY_PRESETS[tenant.makerType]
    : []
  const presetMaterialCategories = tenant.makerType
    ? MAKER_MATERIAL_PRESETS[tenant.makerType]
    : []

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-500">
            Configure your store type and manage categories
          </p>
        </div>
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Saved
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
        )}
      </div>

      {/* Maker Type Section */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Maker Type</h2>
              <p className="text-sm text-gray-500">
                Select your craft type to get relevant category presets
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <MakerTypeSelector
            value={tenant.makerType}
            onChange={handleMakerTypeChange}
            disabled={saveStatus === 'saving'}
          />
        </div>
      </section>

      {/* Product Categories Section */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Product Categories</h2>
              <p className="text-sm text-gray-500">
                Categories for organizing your inventory items
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CategoryManager
            title="Manage Product Categories"
            description="These categories appear in your inventory dropdown. Add custom ones or remove presets you don't need."
            presetCategories={presetProductCategories}
            customCategories={tenant.customCategories || []}
            onAddCategory={(cat) => handleAddCategory(cat, 'product')}
            onRemoveCategory={(cat) => handleRemoveCategory(cat, 'product')}
            disabled={saveStatus === 'saving'}
          />
        </div>
      </section>

      {/* Material Categories Section */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Boxes className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Material Categories</h2>
              <p className="text-sm text-gray-500">
                Categories for organizing your raw materials and supplies
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CategoryManager
            title="Manage Material Categories"
            description="These categories appear in your materials dropdown. Add custom ones for your specific supplies."
            presetCategories={presetMaterialCategories}
            customCategories={tenant.customMaterialCategories || []}
            onAddCategory={(cat) => handleAddCategory(cat, 'material')}
            onRemoveCategory={(cat) => handleRemoveCategory(cat, 'material')}
            disabled={saveStatus === 'saving'}
          />
        </div>
      </section>

      {/* Tips */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">Tips</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>
            • Changing your maker type will update your preset categories, but won't affect
            existing products
          </li>
          <li>• You can add custom categories on top of any preset template</li>
          <li>• Removing a category won't delete products using that category</li>
        </ul>
      </div>
    </div>
  )
}
