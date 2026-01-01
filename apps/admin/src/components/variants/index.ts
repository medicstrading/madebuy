/**
 * Variant Editor Components
 *
 * A comprehensive variant matrix UI for creating and managing product variants.
 *
 * Usage:
 * ```tsx
 * import { VariantEditor } from '@/components/variants'
 *
 * <VariantEditor
 *   pieceId={piece.id}
 *   productCode="RING"
 *   initialAttributes={piece.variantOptions}
 *   initialVariants={piece.variants}
 *   productImages={images}
 *   onSave={handleSave}
 * />
 * ```
 *
 * Or use individual components:
 * ```tsx
 * import {
 *   VariantAttributeEditor,
 *   VariantMatrix,
 *   VariantQuickEdit,
 *   VariantSummary,
 *   useVariantEditor,
 * } from '@/components/variants'
 * ```
 */

// Main component
export { VariantEditor } from './VariantEditor'

// Individual components
export { VariantAttributeEditor } from './VariantAttributeEditor'
export { VariantMatrix } from './VariantMatrix'
export { VariantRow } from './VariantRow'
export { VariantQuickEdit } from './VariantQuickEdit'
export { VariantSummary } from './VariantSummary'

// Hook
export { useVariantEditor } from './useVariantEditor'

// Types
export type {
  VariantAttribute,
  VariantAttributeValue,
  EditableVariant,
  VariantEditorState,
  VariantEditorSnapshot,
  AttributePreset,
  BulkEditAction,
  VariantValidationError,
  SkuValidationResult,
  VariantSummaryStats,
  VariantAttributeEditorProps,
  VariantMatrixProps,
  VariantRowProps,
  VariantQuickEditProps,
  VariantSummaryProps,
} from './types'

// Constants and utilities
export {
  MAX_ATTRIBUTES,
  MAX_COMBINATIONS_WARNING,
  MAX_COMBINATIONS_HARD_LIMIT,
  LOW_STOCK_DEFAULT_THRESHOLD,
  VARIANTS_PER_PAGE,
  ATTRIBUTE_PRESETS,
  COMMON_ATTRIBUTE_NAMES,
  STOCK_STATUS,
  generateId,
  generateSku,
  calculateCombinations,
} from './constants'
