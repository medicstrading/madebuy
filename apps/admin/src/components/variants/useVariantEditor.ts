'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type {
  VariantAttribute,
  VariantAttributeValue,
  EditableVariant,
  VariantEditorState,
  VariantEditorSnapshot,
  BulkEditAction,
  VariantSummaryStats,
  SkuValidationResult,
} from './types'
import {
  generateId,
  generateSku,
  calculateCombinations,
  MAX_COMBINATIONS_HARD_LIMIT,
  LOW_STOCK_DEFAULT_THRESHOLD,
} from './constants'

interface UseVariantEditorOptions {
  initialAttributes?: VariantAttribute[]
  initialVariants?: EditableVariant[]
  productCode?: string
  pieceId?: string
  onDirtyChange?: (isDirty: boolean) => void
}

interface UseVariantEditorReturn {
  // State
  attributes: VariantAttribute[]
  variants: EditableVariant[]
  selectedVariantIds: Set<string>
  isDirty: boolean
  errors: Map<string, string>
  isGenerating: boolean
  isSaving: boolean
  stats: VariantSummaryStats

  // Attribute operations
  addAttribute: (name?: string) => void
  removeAttribute: (attributeId: string) => void
  updateAttributeName: (attributeId: string, name: string) => void
  addAttributeValue: (attributeId: string, value: string) => void
  removeAttributeValue: (attributeId: string, valueId: string) => void
  updateAttributeValue: (attributeId: string, valueId: string, value: string) => void
  reorderAttributes: (fromIndex: number, toIndex: number) => void
  reorderAttributeValues: (attributeId: string, fromIndex: number, toIndex: number) => void
  applyPreset: (preset: { name: string; values: string[] }[]) => void

  // Variant operations
  generateVariants: () => Promise<boolean>
  updateVariant: (variantId: string, updates: Partial<EditableVariant>) => void
  deleteVariants: (variantIds: string[]) => void
  toggleVariantAvailability: (variantId: string) => void

  // Selection
  selectVariant: (variantId: string, selected: boolean) => void
  selectAllVariants: (selected: boolean) => void
  clearSelection: () => void

  // Bulk operations
  applyBulkEdit: (action: BulkEditAction) => void

  // Undo/Redo
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void

  // Validation
  validateSku: (sku: string, variantId: string) => Promise<SkuValidationResult>
  validateAll: () => boolean

  // Persistence
  save: () => Promise<boolean>
  reset: () => void
}

export function useVariantEditor(
  options: UseVariantEditorOptions = {}
): UseVariantEditorReturn {
  const {
    initialAttributes = [],
    initialVariants = [],
    productCode = '',
    pieceId,
    onDirtyChange,
  } = options

  // Core state
  const [state, setState] = useState<VariantEditorState>({
    attributes: initialAttributes,
    variants: initialVariants,
    selectedVariantIds: new Set(),
    isDirty: false,
    errors: new Map(),
    isGenerating: false,
    isSaving: false,
    undoStack: [],
    redoStack: [],
  })

  // Debounce timer for SKU validation
  const skuValidationTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Track dirty state changes
  useEffect(() => {
    onDirtyChange?.(state.isDirty)
  }, [state.isDirty, onDirtyChange])

  // Create snapshot for undo
  const createSnapshot = useCallback((): VariantEditorSnapshot => ({
    attributes: JSON.parse(JSON.stringify(state.attributes)),
    variants: JSON.parse(JSON.stringify(state.variants)),
    timestamp: Date.now(),
  }), [state.attributes, state.variants])

  // Push to undo stack
  const pushUndo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-19), createSnapshot()],
      redoStack: [],
      isDirty: true,
    }))
  }, [createSnapshot])

  // Attribute operations
  const addAttribute = useCallback((name = 'New Attribute') => {
    pushUndo()
    setState((prev) => {
      const newAttribute: VariantAttribute = {
        id: generateId(),
        name,
        values: [],
      }
      return {
        ...prev,
        attributes: [...prev.attributes, newAttribute],
      }
    })
  }, [pushUndo])

  const removeAttribute = useCallback((attributeId: string) => {
    pushUndo()
    setState((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((a) => a.id !== attributeId),
    }))
  }, [pushUndo])

  const updateAttributeName = useCallback((attributeId: string, name: string) => {
    pushUndo()
    setState((prev) => ({
      ...prev,
      attributes: prev.attributes.map((a) =>
        a.id === attributeId ? { ...a, name } : a
      ),
    }))
  }, [pushUndo])

  const addAttributeValue = useCallback((attributeId: string, value: string) => {
    if (!value.trim()) return
    pushUndo()
    setState((prev) => ({
      ...prev,
      attributes: prev.attributes.map((a) => {
        if (a.id !== attributeId) return a
        // Check for duplicate
        if (a.values.some((v) => v.value.toLowerCase() === value.toLowerCase())) {
          return a
        }
        const newValue: VariantAttributeValue = {
          id: generateId(),
          value: value.trim(),
        }
        return { ...a, values: [...a.values, newValue] }
      }),
    }))
  }, [pushUndo])

  const removeAttributeValue = useCallback((attributeId: string, valueId: string) => {
    pushUndo()
    setState((prev) => ({
      ...prev,
      attributes: prev.attributes.map((a) => {
        if (a.id !== attributeId) return a
        return { ...a, values: a.values.filter((v) => v.id !== valueId) }
      }),
    }))
  }, [pushUndo])

  const updateAttributeValue = useCallback(
    (attributeId: string, valueId: string, value: string) => {
      if (!value.trim()) return
      pushUndo()
      setState((prev) => ({
        ...prev,
        attributes: prev.attributes.map((a) => {
          if (a.id !== attributeId) return a
          return {
            ...a,
            values: a.values.map((v) =>
              v.id === valueId ? { ...v, value: value.trim() } : v
            ),
          }
        }),
      }))
    },
    [pushUndo]
  )

  const reorderAttributes = useCallback((fromIndex: number, toIndex: number) => {
    pushUndo()
    setState((prev) => {
      const newAttributes = [...prev.attributes]
      const [moved] = newAttributes.splice(fromIndex, 1)
      newAttributes.splice(toIndex, 0, moved)
      return { ...prev, attributes: newAttributes }
    })
  }, [pushUndo])

  const reorderAttributeValues = useCallback(
    (attributeId: string, fromIndex: number, toIndex: number) => {
      pushUndo()
      setState((prev) => ({
        ...prev,
        attributes: prev.attributes.map((a) => {
          if (a.id !== attributeId) return a
          const newValues = [...a.values]
          const [moved] = newValues.splice(fromIndex, 1)
          newValues.splice(toIndex, 0, moved)
          return { ...a, values: newValues }
        }),
      }))
    },
    [pushUndo]
  )

  const applyPreset = useCallback(
    (preset: { name: string; values: string[] }[]) => {
      pushUndo()
      const newAttributes: VariantAttribute[] = preset.map((p) => ({
        id: generateId(),
        name: p.name,
        values: p.values.map((v) => ({
          id: generateId(),
          value: v,
        })),
      }))
      setState((prev) => ({
        ...prev,
        attributes: [...prev.attributes, ...newAttributes],
      }))
    },
    [pushUndo]
  )

  // Generate variant combinations
  const generateVariants = useCallback(async (): Promise<boolean> => {
    const attributesWithValues = state.attributes.filter((a) => a.values.length > 0)

    if (attributesWithValues.length === 0) {
      setState((prev) => ({ ...prev, variants: [] }))
      return true
    }

    const combinationCount = calculateCombinations(attributesWithValues)
    if (combinationCount > MAX_COMBINATIONS_HARD_LIMIT) {
      setState((prev) => ({
        ...prev,
        errors: new Map([
          ['global', `Too many combinations (${combinationCount}). Maximum is ${MAX_COMBINATIONS_HARD_LIMIT}.`],
        ]),
      }))
      return false
    }

    setState((prev) => ({ ...prev, isGenerating: true }))

    try {
      pushUndo()

      // Generate all combinations using cartesian product
      const combinations: Record<string, string>[] = attributesWithValues.reduce(
        (acc, attr) => {
          if (acc.length === 0) {
            return attr.values.map((v) => ({ [attr.name]: v.value }))
          }
          return acc.flatMap((combo) =>
            attr.values.map((v) => ({ ...combo, [attr.name]: v.value }))
          )
        },
        [] as Record<string, string>[]
      )

      // Create variants from combinations, preserving existing data where possible
      const existingVariantMap = new Map(
        state.variants.map((v) => [JSON.stringify(v.options), v])
      )

      const newVariants: EditableVariant[] = combinations.map((options, index) => {
        const key = JSON.stringify(options)
        const existing = existingVariantMap.get(key)

        if (existing) {
          return existing
        }

        return {
          id: generateId(),
          options,
          sku: generateSku(productCode, options, index + 1),
          price: undefined,
          stock: undefined,
          isAvailable: true,
          compareAtPrice: undefined,
          weight: undefined,
          mediaId: undefined,
          lowStockThreshold: LOW_STOCK_DEFAULT_THRESHOLD,
        }
      })

      setState((prev) => ({
        ...prev,
        variants: newVariants,
        isGenerating: false,
        isDirty: true,
        errors: new Map(),
      }))

      return true
    } catch (error) {
      console.error('Error generating variants:', error)
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        errors: new Map([['global', 'Failed to generate variants']]),
      }))
      return false
    }
  }, [state.attributes, state.variants, productCode, pushUndo])

  // Variant operations
  const updateVariant = useCallback(
    (variantId: string, updates: Partial<EditableVariant>) => {
      setState((prev) => ({
        ...prev,
        variants: prev.variants.map((v) =>
          v.id === variantId ? { ...v, ...updates } : v
        ),
        isDirty: true,
      }))
    },
    []
  )

  const deleteVariants = useCallback((variantIds: string[]) => {
    pushUndo()
    const idsSet = new Set(variantIds)
    setState((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => !idsSet.has(v.id)),
      selectedVariantIds: new Set(
        [...prev.selectedVariantIds].filter((id) => !idsSet.has(id))
      ),
    }))
  }, [pushUndo])

  const toggleVariantAvailability = useCallback((variantId: string) => {
    setState((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.id === variantId ? { ...v, isAvailable: !v.isAvailable } : v
      ),
      isDirty: true,
    }))
  }, [])

  // Selection
  const selectVariant = useCallback((variantId: string, selected: boolean) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedVariantIds)
      if (selected) {
        newSelected.add(variantId)
      } else {
        newSelected.delete(variantId)
      }
      return { ...prev, selectedVariantIds: newSelected }
    })
  }, [])

  const selectAllVariants = useCallback((selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedVariantIds: selected
        ? new Set(prev.variants.map((v) => v.id))
        : new Set(),
    }))
  }, [])

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedVariantIds: new Set() }))
  }, [])

  // Bulk operations
  const applyBulkEdit = useCallback((action: BulkEditAction) => {
    pushUndo()
    setState((prev) => {
      const selectedIds = prev.selectedVariantIds
      if (selectedIds.size === 0) return prev

      const updatedVariants = prev.variants.map((variant) => {
        if (!selectedIds.has(variant.id)) return variant

        switch (action.type) {
          case 'setPrice':
            return { ...variant, price: action.value }

          case 'adjustPrice': {
            const currentPrice = variant.price || 0
            let newPrice = currentPrice
            if (action.mode === 'add') {
              newPrice = currentPrice + action.value
            } else if (action.mode === 'subtract') {
              newPrice = Math.max(0, currentPrice - action.value)
            } else if (action.mode === 'percentage') {
              newPrice = currentPrice * (1 + action.value / 100)
            }
            return { ...variant, price: Math.round(newPrice * 100) / 100 }
          }

          case 'setStock':
            return { ...variant, stock: action.value }

          case 'adjustStock': {
            const currentStock = variant.stock || 0
            let newStock = currentStock
            if (action.mode === 'add') {
              newStock = currentStock + action.value
            } else {
              newStock = Math.max(0, currentStock - action.value)
            }
            return { ...variant, stock: newStock }
          }

          case 'setAvailability':
            return { ...variant, isAvailable: action.value }

          case 'generateSkus': {
            const index = prev.variants.findIndex((v) => v.id === variant.id)
            return {
              ...variant,
              sku: generateSku(action.prefix, variant.options, index + 1),
            }
          }

          case 'setWeight':
            return { ...variant, weight: action.value }

          default:
            return variant
        }
      })

      return { ...prev, variants: updatedVariants, isDirty: true }
    })
  }, [pushUndo])

  // Undo/Redo
  const canUndo = state.undoStack.length > 0
  const canRedo = state.redoStack.length > 0

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.undoStack.length === 0) return prev
      const snapshot = prev.undoStack[prev.undoStack.length - 1]
      return {
        ...prev,
        attributes: snapshot.attributes,
        variants: snapshot.variants,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, createSnapshot()],
        isDirty: true,
      }
    })
  }, [createSnapshot])

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.redoStack.length === 0) return prev
      const snapshot = prev.redoStack[prev.redoStack.length - 1]
      return {
        ...prev,
        attributes: snapshot.attributes,
        variants: snapshot.variants,
        undoStack: [...prev.undoStack, createSnapshot()],
        redoStack: prev.redoStack.slice(0, -1),
        isDirty: true,
      }
    })
  }, [createSnapshot])

  // Validation
  const validateSku = useCallback(
    async (sku: string, variantId: string): Promise<SkuValidationResult> => {
      // Clear existing timer for this variant
      const existingTimer = skuValidationTimers.current.get(variantId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      return new Promise((resolve) => {
        const timer = setTimeout(async () => {
          try {
            // Check for duplicate in current variants
            const isDuplicateLocal = state.variants.some(
              (v) => v.id !== variantId && v.sku === sku
            )

            if (isDuplicateLocal) {
              resolve({
                sku,
                isValid: false,
                isDuplicate: true,
              })
              return
            }

            // Check via API if pieceId is available
            if (pieceId && sku) {
              const response = await fetch(
                `/api/pieces/${pieceId}/variants/validate-sku?sku=${encodeURIComponent(sku)}&variantId=${variantId}`
              )
              if (response.ok) {
                const result = await response.json()
                resolve(result)
                return
              }
            }

            resolve({
              sku,
              isValid: true,
              isDuplicate: false,
            })
          } catch (error) {
            console.error('SKU validation error:', error)
            resolve({
              sku,
              isValid: true,
              isDuplicate: false,
            })
          }
        }, 300) // Debounce 300ms

        skuValidationTimers.current.set(variantId, timer)
      })
    },
    [state.variants, pieceId]
  )

  const validateAll = useCallback((): boolean => {
    const newErrors = new Map<string, string>()

    state.variants.forEach((variant) => {
      // Price validation
      if (variant.price !== undefined && variant.price < 0) {
        newErrors.set(variant.id, 'Price must be positive')
      }

      // Stock validation
      if (variant.stock !== undefined && (variant.stock < 0 || !Number.isInteger(variant.stock))) {
        newErrors.set(variant.id, 'Stock must be a non-negative integer')
      }

      // SKU uniqueness check
      const duplicateSku = state.variants.find(
        (v) => v.id !== variant.id && v.sku && v.sku === variant.sku
      )
      if (duplicateSku) {
        newErrors.set(variant.id, 'Duplicate SKU')
      }
    })

    setState((prev) => ({ ...prev, errors: newErrors }))
    return newErrors.size === 0
  }, [state.variants])

  // Persistence
  const save = useCallback(async (): Promise<boolean> => {
    if (!validateAll()) return false
    if (!pieceId) return false

    setState((prev) => ({ ...prev, isSaving: true }))

    try {
      const response = await fetch(`/api/pieces/${pieceId}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: state.attributes,
          variants: state.variants,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save variants')
      }

      setState((prev) => ({
        ...prev,
        isSaving: false,
        isDirty: false,
        undoStack: [],
        redoStack: [],
      }))

      return true
    } catch (error) {
      console.error('Save error:', error)
      setState((prev) => ({
        ...prev,
        isSaving: false,
        errors: new Map([['global', 'Failed to save variants']]),
      }))
      return false
    }
  }, [pieceId, state.attributes, state.variants, validateAll])

  const reset = useCallback(() => {
    setState({
      attributes: initialAttributes,
      variants: initialVariants,
      selectedVariantIds: new Set(),
      isDirty: false,
      errors: new Map(),
      isGenerating: false,
      isSaving: false,
      undoStack: [],
      redoStack: [],
    })
  }, [initialAttributes, initialVariants])

  // Calculate stats
  const stats: VariantSummaryStats = useMemo(() => {
    const variants = state.variants
    const inStock = variants.filter(
      (v) => v.isAvailable && v.stock !== undefined && v.stock > (v.lowStockThreshold || LOW_STOCK_DEFAULT_THRESHOLD)
    ).length
    const lowStock = variants.filter(
      (v) =>
        v.isAvailable &&
        v.stock !== undefined &&
        v.stock > 0 &&
        v.stock <= (v.lowStockThreshold || LOW_STOCK_DEFAULT_THRESHOLD)
    ).length
    const outOfStock = variants.filter(
      (v) => v.isAvailable && v.stock !== undefined && v.stock === 0
    ).length
    const unavailable = variants.filter((v) => !v.isAvailable).length

    const prices = variants
      .filter((v) => v.price !== undefined && v.price > 0)
      .map((v) => v.price as number)

    const stocks = variants
      .filter((v) => v.stock !== undefined)
      .map((v) => ({
        stock: v.stock as number,
        price: v.price || 0,
      }))

    return {
      totalVariants: variants.length,
      inStock,
      lowStock,
      outOfStock,
      unavailable,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
      totalInventoryValue: stocks.reduce((sum, s) => sum + s.stock * s.price, 0),
      totalInventoryCount: stocks.reduce((sum, s) => sum + s.stock, 0),
    }
  }, [state.variants])

  return {
    // State
    attributes: state.attributes,
    variants: state.variants,
    selectedVariantIds: state.selectedVariantIds,
    isDirty: state.isDirty,
    errors: state.errors,
    isGenerating: state.isGenerating,
    isSaving: state.isSaving,
    stats,

    // Attribute operations
    addAttribute,
    removeAttribute,
    updateAttributeName,
    addAttributeValue,
    removeAttributeValue,
    updateAttributeValue,
    reorderAttributes,
    reorderAttributeValues,
    applyPreset,

    // Variant operations
    generateVariants,
    updateVariant,
    deleteVariants,
    toggleVariantAvailability,

    // Selection
    selectVariant,
    selectAllVariants,
    clearSelection,

    // Bulk operations
    applyBulkEdit,

    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,

    // Validation
    validateSku,
    validateAll,

    // Persistence
    save,
    reset,
  }
}
