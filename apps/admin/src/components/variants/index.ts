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

// Constants and utilities
export {
  ATTRIBUTE_PRESETS,
  COMMON_ATTRIBUTE_NAMES,
  calculateCombinations,
  generateId,
  generateSku,
  LOW_STOCK_DEFAULT_THRESHOLD,
  MAX_ATTRIBUTES,
  MAX_COMBINATIONS_HARD_LIMIT,
  MAX_COMBINATIONS_WARNING,
  STOCK_STATUS,
  VARIANTS_PER_PAGE,
} from './constants'
// Types
export type {
  AttributePreset,
  BulkEditAction,
  EditableVariant,
  SkuValidationResult,
  VariantAttribute,
  VariantAttributeEditorProps,
  VariantAttributeValue,
  VariantEditorSnapshot,
  VariantEditorState,
  VariantMatrixProps,
  VariantQuickEditProps,
  VariantRowProps,
  VariantSummaryProps,
  VariantSummaryStats,
  VariantValidationError,
} from './types'
// Hook
export { useVariantEditor } from './useVariantEditor'
// Individual components
export { VariantAttributeEditor } from './VariantAttributeEditor'
// Main component
export { VariantEditor } from './VariantEditor'
export { VariantMatrix } from './VariantMatrix'
export { VariantQuickEdit } from './VariantQuickEdit'
export { VariantRow } from './VariantRow'
export { VariantSummary } from './VariantSummary'
