'use client'

import {
  getTenantCategories,
  getTenantMaterialCategories,
  MAKER_CATEGORY_PRESETS,
  MAKER_MATERIAL_PRESETS,
} from '@madebuy/shared/src/constants/makerPresets'
import type { MakerType, Tenant } from '@madebuy/shared/src/types/tenant'
import { useEffect, useState } from 'react'

interface UseTenantCategoriesResult {
  // Product categories
  productCategories: string[]
  presetProductCategories: string[]
  customProductCategories: string[]

  // Material categories
  materialCategories: string[]
  presetMaterialCategories: string[]
  customMaterialCategories: string[]

  // Maker type
  makerType: MakerType | undefined

  // Loading state
  isLoading: boolean
  error: string | null

  // Refresh function
  refresh: () => Promise<void>
}

/**
 * Hook to get tenant's product and material categories
 * Combines preset categories (based on maker type) with custom categories
 */
export function useTenantCategories(): UseTenantCategoriesResult {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenant = async () => {
    try {
      const response = await fetch('/api/tenant')
      if (response.ok) {
        const data = await response.json()
        setTenant(data)
        setError(null)
      } else {
        setError('Failed to load categories')
      }
    } catch (_err) {
      setError('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTenant()
  }, [fetchTenant])

  // Calculate categories
  const makerType = tenant?.makerType
  const customProductCategories = tenant?.customCategories || []
  const customMaterialCategories = tenant?.customMaterialCategories || []

  const presetProductCategories = makerType
    ? MAKER_CATEGORY_PRESETS[makerType]
    : []
  const presetMaterialCategories = makerType
    ? MAKER_MATERIAL_PRESETS[makerType]
    : []

  const productCategories = getTenantCategories(
    makerType,
    customProductCategories,
  )
  const materialCategories = getTenantMaterialCategories(
    makerType,
    customMaterialCategories,
  )

  return {
    productCategories,
    presetProductCategories,
    customProductCategories,
    materialCategories,
    presetMaterialCategories,
    customMaterialCategories,
    makerType,
    isLoading,
    error,
    refresh: fetchTenant,
  }
}

/**
 * Fallback categories for when maker type is not set
 * Uses jewelry as default for backward compatibility
 */
export const FALLBACK_PRODUCT_CATEGORIES = MAKER_CATEGORY_PRESETS.jewelry
export const FALLBACK_MATERIAL_CATEGORIES = MAKER_MATERIAL_PRESETS.jewelry
