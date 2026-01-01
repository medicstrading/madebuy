'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  X,
  ChevronDown,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import type { VariantAttribute, VariantAttributeEditorProps } from './types'
import {
  ATTRIBUTE_PRESETS,
  COMMON_ATTRIBUTE_NAMES,
  MAX_ATTRIBUTES,
  MAX_COMBINATIONS_WARNING,
  calculateCombinations,
  generateId,
} from './constants'

export function VariantAttributeEditor({
  attributes,
  onAttributesChange,
  maxAttributes = MAX_ATTRIBUTES,
  maxCombinations = MAX_COMBINATIONS_WARNING,
  disabled = false,
}: VariantAttributeEditorProps) {
  const [showPresets, setShowPresets] = useState(false)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({})
  const [draggedAttributeId, setDraggedAttributeId] = useState<string | null>(null)
  const [draggedValueData, setDraggedValueData] = useState<{
    attributeId: string
    valueIndex: number
  } | null>(null)

  const presetsRef = useRef<HTMLDivElement>(null)

  // Calculate current combinations
  const currentCombinations = calculateCombinations(attributes)
  const isOverWarningLimit = currentCombinations > maxCombinations
  const canAddAttribute = attributes.length < maxAttributes && !disabled

  // Add new attribute
  const handleAddAttribute = useCallback(() => {
    if (!canAddAttribute) return

    // Find unique name
    let name = 'Size'
    let counter = 1
    const existingNames = new Set(attributes.map((a) => a.name.toLowerCase()))
    while (existingNames.has(name.toLowerCase())) {
      const suggestion = COMMON_ATTRIBUTE_NAMES[counter] || `Attribute ${counter + 1}`
      name = suggestion
      counter++
    }

    const newAttribute: VariantAttribute = {
      id: generateId(),
      name,
      values: [],
    }

    onAttributesChange([...attributes, newAttribute])
    setEditingNameId(newAttribute.id)
  }, [attributes, canAddAttribute, onAttributesChange])

  // Remove attribute
  const handleRemoveAttribute = useCallback(
    (attributeId: string) => {
      onAttributesChange(attributes.filter((a) => a.id !== attributeId))
    },
    [attributes, onAttributesChange]
  )

  // Update attribute name
  const handleUpdateAttributeName = useCallback(
    (attributeId: string, name: string) => {
      onAttributesChange(
        attributes.map((a) => (a.id === attributeId ? { ...a, name } : a))
      )
    },
    [attributes, onAttributesChange]
  )

  // Add value to attribute
  const handleAddValue = useCallback(
    (attributeId: string, value: string) => {
      if (!value.trim()) return

      onAttributesChange(
        attributes.map((a) => {
          if (a.id !== attributeId) return a
          // Check for duplicate
          if (a.values.some((v) => v.value.toLowerCase() === value.trim().toLowerCase())) {
            return a
          }
          return {
            ...a,
            values: [...a.values, { id: generateId(), value: value.trim() }],
          }
        })
      )

      setNewValueInputs((prev) => ({ ...prev, [attributeId]: '' }))
    },
    [attributes, onAttributesChange]
  )

  // Remove value from attribute
  const handleRemoveValue = useCallback(
    (attributeId: string, valueId: string) => {
      onAttributesChange(
        attributes.map((a) => {
          if (a.id !== attributeId) return a
          return { ...a, values: a.values.filter((v) => v.id !== valueId) }
        })
      )
    },
    [attributes, onAttributesChange]
  )

  // Handle value input key press
  const handleValueKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, attributeId: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const value = newValueInputs[attributeId] || ''
        handleAddValue(attributeId, value)
      }
    },
    [handleAddValue, newValueInputs]
  )

  // Apply preset
  const handleApplyPreset = useCallback(
    (preset: (typeof ATTRIBUTE_PRESETS)[0]) => {
      // Check if adding preset would exceed max attributes
      const totalAfterPreset = attributes.length + preset.attributes.length
      if (totalAfterPreset > maxAttributes) {
        return
      }

      const newAttributes: VariantAttribute[] = preset.attributes.map((pa) => ({
        id: generateId(),
        name: pa.name,
        values: pa.values.map((v) => ({ id: generateId(), value: v })),
      }))

      onAttributesChange([...attributes, ...newAttributes])
      setShowPresets(false)
    },
    [attributes, maxAttributes, onAttributesChange]
  )

  // Drag and drop for attributes
  const handleAttributeDragStart = useCallback((attributeId: string) => {
    setDraggedAttributeId(attributeId)
  }, [])

  const handleAttributeDragOver = useCallback(
    (e: React.DragEvent, targetAttributeId: string) => {
      e.preventDefault()
      if (!draggedAttributeId || draggedAttributeId === targetAttributeId) return

      const fromIndex = attributes.findIndex((a) => a.id === draggedAttributeId)
      const toIndex = attributes.findIndex((a) => a.id === targetAttributeId)

      if (fromIndex !== -1 && toIndex !== -1) {
        const newAttributes = [...attributes]
        const [moved] = newAttributes.splice(fromIndex, 1)
        newAttributes.splice(toIndex, 0, moved)
        onAttributesChange(newAttributes)
      }
    },
    [attributes, draggedAttributeId, onAttributesChange]
  )

  const handleAttributeDragEnd = useCallback(() => {
    setDraggedAttributeId(null)
  }, [])

  // Drag and drop for values
  const handleValueDragStart = useCallback(
    (attributeId: string, valueIndex: number) => {
      setDraggedValueData({ attributeId, valueIndex })
    },
    []
  )

  const handleValueDragOver = useCallback(
    (e: React.DragEvent, attributeId: string, targetIndex: number) => {
      e.preventDefault()
      if (!draggedValueData) return
      if (draggedValueData.attributeId !== attributeId) return
      if (draggedValueData.valueIndex === targetIndex) return

      onAttributesChange(
        attributes.map((a) => {
          if (a.id !== attributeId) return a
          const newValues = [...a.values]
          const [moved] = newValues.splice(draggedValueData.valueIndex, 1)
          newValues.splice(targetIndex, 0, moved)
          setDraggedValueData({ attributeId, valueIndex: targetIndex })
          return { ...a, values: newValues }
        })
      )
    },
    [attributes, draggedValueData, onAttributesChange]
  )

  const handleValueDragEnd = useCallback(() => {
    setDraggedValueData(null)
  }, [])

  return (
    <div className="space-y-4">
      {/* Header with Add and Presets buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Variant Attributes</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {attributes.length}/{maxAttributes} attributes
            {currentCombinations > 0 && ` = ${currentCombinations} combinations`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Presets dropdown */}
          <div className="relative" ref={presetsRef}>
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              disabled={!canAddAttribute}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Presets
              <ChevronDown className="h-3 w-3" />
            </button>

            {showPresets && (
              <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="max-h-72 overflow-y-auto p-2">
                  {ATTRIBUTE_PRESETS.map((preset) => {
                    const wouldExceed =
                      attributes.length + preset.attributes.length > maxAttributes
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        disabled={wouldExceed}
                        className="w-full rounded-md p-2 text-left hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {preset.name}
                        </div>
                        <div className="text-xs text-gray-500">{preset.description}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add attribute button */}
          <button
            type="button"
            onClick={handleAddAttribute}
            disabled={!canAddAttribute}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Attribute
          </button>
        </div>
      </div>

      {/* Warning for too many combinations */}
      {isOverWarningLimit && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Large number of variants ({currentCombinations})
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Consider reducing options to improve performance. Maximum recommended is{' '}
              {maxCombinations}.
            </p>
          </div>
        </div>
      )}

      {/* Attributes list */}
      {attributes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No attributes</h3>
          <p className="mt-1 text-xs text-gray-500">
            Add attributes like Size, Color, or Material to create product variants.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleAddAttribute}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Attribute
            </button>
            <button
              type="button"
              onClick={() => setShowPresets(true)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Use Preset
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map((attribute, attrIndex) => (
            <div
              key={attribute.id}
              draggable={!disabled}
              onDragStart={() => handleAttributeDragStart(attribute.id)}
              onDragOver={(e) => handleAttributeDragOver(e, attribute.id)}
              onDragEnd={handleAttributeDragEnd}
              className={`rounded-lg border bg-white ${
                draggedAttributeId === attribute.id
                  ? 'border-blue-400 shadow-md'
                  : 'border-gray-200'
              }`}
            >
              {/* Attribute header */}
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                {/* Drag handle */}
                <button
                  type="button"
                  className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                {/* Attribute name */}
                {editingNameId === attribute.id ? (
                  <input
                    type="text"
                    value={attribute.name}
                    onChange={(e) =>
                      handleUpdateAttributeName(attribute.id, e.target.value)
                    }
                    onBlur={() => setEditingNameId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        setEditingNameId(null)
                      }
                    }}
                    autoFocus
                    className="flex-1 rounded border border-blue-300 px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    list={`attribute-names-${attribute.id}`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => !disabled && setEditingNameId(attribute.id)}
                    className="flex-1 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                  >
                    {attribute.name}
                    <span className="ml-2 text-xs text-gray-400">
                      ({attribute.values.length} values)
                    </span>
                  </button>
                )}
                <datalist id={`attribute-names-${attribute.id}`}>
                  {COMMON_ATTRIBUTE_NAMES.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                {/* Remove attribute */}
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(attribute.id)}
                  disabled={disabled}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                  aria-label="Remove attribute"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Attribute values */}
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {attribute.values.map((value, valueIndex) => (
                    <div
                      key={value.id}
                      draggable={!disabled}
                      onDragStart={() =>
                        handleValueDragStart(attribute.id, valueIndex)
                      }
                      onDragOver={(e) =>
                        handleValueDragOver(e, attribute.id, valueIndex)
                      }
                      onDragEnd={handleValueDragEnd}
                      className={`group flex items-center gap-1 rounded-full border bg-gray-50 px-3 py-1 text-sm ${
                        draggedValueData?.attributeId === attribute.id &&
                        draggedValueData?.valueIndex === valueIndex
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <GripVertical className="h-3 w-3 cursor-grab text-gray-400 opacity-0 group-hover:opacity-100" />
                      <span className="text-gray-700">{value.value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveValue(attribute.id, value.id)}
                        disabled={disabled}
                        className="ml-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Remove ${value.value}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add value input */}
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newValueInputs[attribute.id] || ''}
                      onChange={(e) =>
                        setNewValueInputs((prev) => ({
                          ...prev,
                          [attribute.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => handleValueKeyDown(e, attribute.id)}
                      placeholder="Add value..."
                      disabled={disabled}
                      className="w-24 rounded-l-lg border border-gray-200 px-2 py-1 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleAddValue(
                          attribute.id,
                          newValueInputs[attribute.id] || ''
                        )
                      }
                      disabled={
                        disabled || !newValueInputs[attribute.id]?.trim()
                      }
                      className="rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Add value"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {attribute.values.length === 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Add at least one value to use this attribute
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close presets */}
      {showPresets && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowPresets(false)}
        />
      )}
    </div>
  )
}
