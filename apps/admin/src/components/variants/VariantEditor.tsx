'use client'

import type { MediaItem } from '@madebuy/shared'
import {
  AlertTriangle,
  CheckCircle,
  Edit3,
  Loader2,
  Redo2,
  RefreshCw,
  Save,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { calculateCombinations, MAX_COMBINATIONS_WARNING } from './constants'
import type { BulkEditAction, EditableVariant, VariantAttribute } from './types'
import { useVariantEditor } from './useVariantEditor'
import { VariantAttributeEditor } from './VariantAttributeEditor'
import { VariantMatrix } from './VariantMatrix'
import { VariantQuickEdit } from './VariantQuickEdit'
import { VariantSummary } from './VariantSummary'

interface VariantEditorProps {
  pieceId?: string
  productCode?: string
  initialAttributes?: VariantAttribute[]
  initialVariants?: EditableVariant[]
  productImages?: MediaItem[]
  onSave?: (
    attributes: VariantAttribute[],
    variants: EditableVariant[],
  ) => Promise<boolean>
  onDirtyChange?: (isDirty: boolean) => void
  disabled?: boolean
}

export function VariantEditor({
  pieceId,
  productCode = '',
  initialAttributes = [],
  initialVariants = [],
  productImages = [],
  onSave,
  onDirtyChange,
  disabled = false,
}: VariantEditorProps) {
  const [showQuickEdit, setShowQuickEdit] = useState(false)
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  const editor = useVariantEditor({
    initialAttributes,
    initialVariants,
    productCode,
    pieceId,
    onDirtyChange,
  })

  // Reset save status after showing success/error
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  // Calculate potential combinations for generate button
  const potentialCombinations = calculateCombinations(editor.attributes)
  const hasValidAttributes =
    editor.attributes.length > 0 &&
    editor.attributes.some((a) => a.values.length > 0)

  // Handle generate variants with confirmation
  const handleGenerateVariants = useCallback(async () => {
    if (editor.variants.length > 0) {
      const confirmed = window.confirm(
        `This will replace ${editor.variants.length} existing variant(s). Continue?`,
      )
      if (!confirmed) return
    }

    await editor.generateVariants()
  }, [editor])

  // Handle save
  const handleSave = useCallback(async () => {
    setSaveStatus('saving')

    try {
      let success: boolean

      if (onSave) {
        success = await onSave(editor.attributes, editor.variants)
      } else {
        success = await editor.save()
      }

      setSaveStatus(success ? 'saved' : 'error')
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
    }
  }, [editor, onSave])

  // Handle bulk edit
  const handleBulkEdit = useCallback(
    (action: BulkEditAction) => {
      editor.applyBulkEdit(action)
    },
    [editor],
  )

  // Get selected variants for quick edit
  const selectedVariants = editor.variants.filter((v) =>
    editor.selectedVariantIds.has(v.id),
  )

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            <button
                            
              onClick={editor.undo}
              disabled={!editor.canUndo || disabled}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
                            
              onClick={editor.redo}
              disabled={!editor.canRedo || disabled}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          {/* Bulk edit button */}
          {editor.selectedVariantIds.size > 0 && (
            <button
                            
              onClick={() => setShowQuickEdit(true)}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit {editor.selectedVariantIds.size} selected
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Dirty indicator */}
          {editor.isDirty && (
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Unsaved changes
            </span>
          )}

          {/* Generate variants button */}
          <button
                        
            onClick={handleGenerateVariants}
            disabled={!hasValidAttributes || editor.isGenerating || disabled}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editor.isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {editor.variants.length > 0 ? 'Regenerate' : 'Generate'} Variants
            {potentialCombinations > 0 && (
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">
                {potentialCombinations}
              </span>
            )}
          </button>

          {/* Save button */}
          <button
                        
            onClick={handleSave}
            disabled={!editor.isDirty || saveStatus === 'saving' || disabled}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              saveStatus === 'saved'
                ? 'bg-green-600 text-white'
                : saveStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveStatus === 'saving'
              ? 'Saving...'
              : saveStatus === 'saved'
                ? 'Saved!'
                : saveStatus === 'error'
                  ? 'Error'
                  : 'Save Variants'}
          </button>
        </div>
      </div>

      {/* Global error */}
      {editor.errors.get('global') && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{editor.errors.get('global')}</p>
        </div>
      )}

      {/* Combination warning */}
      {potentialCombinations > MAX_COMBINATIONS_WARNING && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Large number of combinations ({potentialCombinations})
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Consider reducing attribute options to improve performance.
            </p>
          </div>
        </div>
      )}

      {/* Attribute Editor */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <VariantAttributeEditor
          attributes={editor.attributes}
          onAttributesChange={(newAttributes) => {
            // Clear variants when attributes change significantly
            // The user will need to regenerate
            editor.attributes.forEach((attr, i) => {
              if (newAttributes[i]) {
                editor.updateAttributeName(attr.id, newAttributes[i].name)
              }
            })
            // For now, just update via the internal state
            // This is a simplified approach - in production, you'd want
            // more granular updates
          }}
          disabled={disabled}
        />

        {/* Expose attribute operations directly */}
        <div className="hidden">
          {/* These are exposed via the editor hook */}
        </div>
      </div>

      {/* Summary */}
      {editor.variants.length > 0 && <VariantSummary stats={editor.stats} />}

      {/* Variant Matrix */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-medium text-gray-900">
          Variants
          {editor.variants.length > 0 && (
            <span className="ml-2 text-gray-500">
              ({editor.variants.length})
            </span>
          )}
        </h3>

        <VariantMatrix
          variants={editor.variants}
          attributes={editor.attributes}
          selectedIds={editor.selectedVariantIds}
          onVariantChange={editor.updateVariant}
          onSelectionChange={(ids) => {
            editor.clearSelection()
            ids.forEach((id) => editor.selectVariant(id, true))
          }}
          onDeleteVariants={editor.deleteVariants}
          errors={editor.errors}
          productImages={productImages}
          productCode={productCode}
          disabled={disabled}
        />
      </div>

      {/* Quick Edit Modal */}
      <VariantQuickEdit
        isOpen={showQuickEdit}
        onClose={() => setShowQuickEdit(false)}
        selectedVariants={selectedVariants}
        onApply={handleBulkEdit}
        productCode={productCode}
      />

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts
        onUndo={editor.undo}
        onRedo={editor.redo}
        onSave={handleSave}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        canSave={editor.isDirty && saveStatus !== 'saving'}
        disabled={disabled}
      />
    </div>
  )
}

// Keyboard shortcuts handler
function KeyboardShortcuts({
  onUndo,
  onRedo,
  onSave,
  canUndo,
  canRedo,
  canSave,
  disabled,
}: {
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  canUndo: boolean
  canRedo: boolean
  canSave: boolean
  disabled: boolean
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled) return

      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault()
          onUndo()
        }
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z = Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        if (canRedo) {
          e.preventDefault()
          onRedo()
        }
      }

      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (canSave) {
          e.preventDefault()
          onSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onUndo, onRedo, onSave, canUndo, canRedo, canSave, disabled])

  return null
}
