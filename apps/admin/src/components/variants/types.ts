/**
 * Variant Editor Types
 * Types for the variant matrix UI components
 */

import type { ProductVariant, MediaItem } from '@madebuy/shared'

/**
 * Variant Attribute - defines a single attribute type (e.g., Size, Color)
 */
export interface VariantAttribute {
  id: string
  name: string
  values: VariantAttributeValue[]
}

/**
 * Variant Attribute Value - a single value within an attribute
 */
export interface VariantAttributeValue {
  id: string
  value: string
}

/**
 * Extended ProductVariant with additional editing fields
 */
export interface EditableVariant extends ProductVariant {
  compareAtPrice?: number
  weight?: number
  mediaId?: string
  lowStockThreshold?: number
  barcode?: string
}

/**
 * Variant Editor State
 */
export interface VariantEditorState {
  attributes: VariantAttribute[]
  variants: EditableVariant[]
  selectedVariantIds: Set<string>
  isDirty: boolean
  errors: Map<string, string>
  isGenerating: boolean
  isSaving: boolean
  undoStack: VariantEditorSnapshot[]
  redoStack: VariantEditorSnapshot[]
}

/**
 * Snapshot for undo/redo
 */
export interface VariantEditorSnapshot {
  attributes: VariantAttribute[]
  variants: EditableVariant[]
  timestamp: number
}

/**
 * Preset for common attribute configurations
 */
export interface AttributePreset {
  id: string
  name: string
  description: string
  attributes: Array<{
    name: string
    values: string[]
  }>
}

/**
 * Bulk edit action types
 */
export type BulkEditAction =
  | { type: 'setPrice'; value: number }
  | { type: 'adjustPrice'; value: number; mode: 'add' | 'subtract' | 'percentage' }
  | { type: 'setStock'; value: number }
  | { type: 'adjustStock'; value: number; mode: 'add' | 'subtract' }
  | { type: 'setAvailability'; value: boolean }
  | { type: 'generateSkus'; prefix: string }
  | { type: 'setWeight'; value: number }

/**
 * Variant validation error
 */
export interface VariantValidationError {
  variantId: string
  field: string
  message: string
}

/**
 * SKU validation result from API
 */
export interface SkuValidationResult {
  sku: string
  isValid: boolean
  isDuplicate: boolean
  existingPieceId?: string
  existingPieceName?: string
}

/**
 * Variant Summary Stats
 */
export interface VariantSummaryStats {
  totalVariants: number
  inStock: number
  lowStock: number
  outOfStock: number
  unavailable: number
  priceRange: {
    min: number
    max: number
  }
  totalInventoryValue: number
  totalInventoryCount: number
}

/**
 * Props for VariantAttributeEditor
 */
export interface VariantAttributeEditorProps {
  attributes: VariantAttribute[]
  onAttributesChange: (attributes: VariantAttribute[]) => void
  maxAttributes?: number
  maxCombinations?: number
  disabled?: boolean
}

/**
 * Props for VariantMatrix
 */
export interface VariantMatrixProps {
  variants: EditableVariant[]
  attributes: VariantAttribute[]
  selectedIds: Set<string>
  onVariantChange: (variantId: string, updates: Partial<EditableVariant>) => void
  onSelectionChange: (selectedIds: Set<string>) => void
  onDeleteVariants: (variantIds: string[]) => void
  errors: Map<string, string>
  productImages?: MediaItem[]
  productCode?: string
  disabled?: boolean
}

/**
 * Props for VariantRow
 */
export interface VariantRowProps {
  variant: EditableVariant
  attributes: VariantAttribute[]
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onChange: (updates: Partial<EditableVariant>) => void
  onDelete: () => void
  error?: string
  productImages?: MediaItem[]
  disabled?: boolean
}

/**
 * Props for VariantQuickEdit
 */
export interface VariantQuickEditProps {
  isOpen: boolean
  onClose: () => void
  selectedVariants: EditableVariant[]
  onApply: (action: BulkEditAction) => void
  productCode?: string
}

/**
 * Props for VariantSummary
 */
export interface VariantSummaryProps {
  stats: VariantSummaryStats
  className?: string
}
