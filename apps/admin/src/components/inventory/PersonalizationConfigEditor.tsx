'use client'

import type {
  PersonalizationConfig,
  PersonalizationField,
  PersonalizationFieldType,
} from '@madebuy/shared'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

interface PersonalizationConfigEditorProps {
  pieceId: string
  pieceName: string
  initialConfig?: PersonalizationConfig
}

const FIELD_TYPES: {
  value: PersonalizationFieldType
  label: string
  description: string
}[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  {
    value: 'textarea',
    label: 'Long Text',
    description: 'Multi-line text area',
  },
  { value: 'select', label: 'Dropdown', description: 'Select from options' },
  { value: 'checkbox', label: 'Checkbox', description: 'Yes/No toggle' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'file', label: 'File Upload', description: 'Image/file upload' },
]

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function createEmptyField(): PersonalizationField {
  return {
    id: generateFieldId(),
    name: '',
    type: 'text',
    required: false,
    displayOrder: 0,
  }
}

export function PersonalizationConfigEditor({
  pieceId,
  pieceName,
  initialConfig,
}: PersonalizationConfigEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Config state
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
  const [fields, setFields] = useState<PersonalizationField[]>(
    initialConfig?.fields ?? [],
  )
  const [instructions, setInstructions] = useState(
    initialConfig?.instructions ?? '',
  )
  const [processingDays, setProcessingDays] = useState<number | undefined>(
    initialConfig?.processingDays,
  )

  // Field expansion state
  const [expandedField, setExpandedField] = useState<string | null>(null)

  const addField = useCallback(() => {
    const newField = createEmptyField()
    newField.displayOrder = fields.length
    setFields((prev) => [...prev, newField])
    setExpandedField(newField.id)
  }, [fields.length])

  const removeField = useCallback(
    (fieldId: string) => {
      setFields((prev) => prev.filter((f) => f.id !== fieldId))
      if (expandedField === fieldId) {
        setExpandedField(null)
      }
    },
    [expandedField],
  )

  const updateField = useCallback(
    (fieldId: string, updates: Partial<PersonalizationField>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      )
    },
    [],
  )

  const moveField = useCallback((fieldId: string, direction: 'up' | 'down') => {
    setFields((prev) => {
      const index = prev.findIndex((f) => f.id === fieldId)
      if (index === -1) return prev
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.length - 1) return prev

      const newFields = [...prev]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      ;[newFields[index], newFields[swapIndex]] = [
        newFields[swapIndex],
        newFields[index],
      ]

      // Update display orders
      return newFields.map((f, i) => ({ ...f, displayOrder: i }))
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate fields
      if (enabled && fields.length > 0) {
        for (const field of fields) {
          if (!field.name.trim()) {
            throw new Error(`Please provide a name for all fields`)
          }
          if (
            field.type === 'select' &&
            (!field.options || field.options.length === 0)
          ) {
            throw new Error(`Field "${field.name}" needs at least one option`)
          }
        }
      }

      const config: PersonalizationConfig = {
        enabled,
        fields: fields.map((f, i) => ({ ...f, displayOrder: i })),
        instructions: instructions.trim() || undefined,
        processingDays: processingDays || undefined,
      }

      const response = await fetch(`/api/pieces/${pieceId}/personalization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save personalization config')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Personalization Options
          </h2>
          <p className="text-sm text-gray-500">
            Allow customers to customize &ldquo;{pieceName}&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
          style={{
            backgroundColor: enabled ? '#dcfce7' : '#f3f4f6',
            borderColor: enabled ? '#22c55e' : '#d1d5db',
          }}
        >
          {enabled ? (
            <ToggleRight className="h-5 w-5 text-green-600" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-gray-400" />
          )}
          <span
            className={enabled ? 'text-green-700 font-medium' : 'text-gray-600'}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </button>
      </div>

      {enabled && (
        <>
          {/* Instructions */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions for Customers
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Optional instructions shown at the top of the personalization form..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Processing Time */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">
                Extra Processing Time (days)
              </label>
            </div>
            <input
              type="number"
              min={0}
              value={processingDays ?? ''}
              onChange={(e) =>
                setProcessingDays(
                  e.target.value ? parseInt(e.target.value, 10) : undefined,
                )
              }
              placeholder="0"
              className="w-32 rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Additional days needed for personalized items
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Personalization Fields
              </h3>
              <button
                onClick={addField}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <HelpCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  No fields configured yet
                </p>
                <button
                  onClick={addField}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  Add your first field
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    isExpanded={expandedField === field.id}
                    onToggle={() =>
                      setExpandedField(
                        expandedField === field.id ? null : field.id,
                      )
                    }
                    onUpdate={(updates) => updateField(field.id, updates)}
                    onRemove={() => removeField(field.id)}
                    onMoveUp={() => moveField(field.id, 'up')}
                    onMoveDown={() => moveField(field.id, 'down')}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Configuration
        </button>

        {success && (
          <span className="text-sm text-green-600 font-medium">
            Saved successfully!
          </span>
        )}

        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}

interface FieldEditorProps {
  field: PersonalizationField
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<PersonalizationField>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}

function FieldEditor({
  field,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: FieldEditorProps) {
  const [options, setOptions] = useState<string[]>(field.options || [])
  const [newOption, setNewOption] = useState('')

  const addOption = () => {
    if (newOption.trim()) {
      const updated = [...options, newOption.trim()]
      setOptions(updated)
      onUpdate({ options: updated })
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index)
    setOptions(updated)
    onUpdate({ options: updated })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {field.name || 'Untitled Field'}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {FIELD_TYPES.find((t) => t.value === field.type)?.label ||
                field.type}
            </span>
            {field.required && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                Required
              </span>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 ml-2"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Field Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name *
              </label>
              <input
                type="text"
                value={field.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="e.g., Engraving Text"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Field Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type
              </label>
              <select
                value={field.type}
                onChange={(e) =>
                  onUpdate({ type: e.target.value as PersonalizationFieldType })
                }
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Placeholder & Help Text */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) =>
                  onUpdate({ placeholder: e.target.value || undefined })
                }
                placeholder="Placeholder text..."
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Help Text
              </label>
              <input
                type="text"
                value={field.helpText || ''}
                onChange={(e) =>
                  onUpdate({ helpText: e.target.value || undefined })
                }
                placeholder="Instructions for customer..."
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type-specific options */}
          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Length
                </label>
                <input
                  type="number"
                  min={0}
                  value={field.minLength ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      minLength: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  min={0}
                  value={field.maxLength ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      maxLength: e.target.value
                        ? parseInt(e.target.value, 10)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min
                </label>
                <input
                  type="number"
                  value={field.min ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      min: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max
                </label>
                <input
                  type="number"
                  value={field.max ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      max: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Step
                </label>
                <input
                  type="number"
                  value={field.step ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      step: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {field.type === 'select' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      readOnly
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"
                    />
                    <button
                      onClick={() => removeOption(idx)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), addOption())
                    }
                    placeholder="Add option..."
                    className="flex-1 rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={addOption}
                    className="p-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {field.type === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max File Size (MB)
              </label>
              <input
                type="number"
                min={1}
                value={field.maxFileSizeMB ?? ''}
                onChange={(e) =>
                  onUpdate({
                    maxFileSizeMB: e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined,
                  })
                }
                placeholder="10"
                className="w-32 rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Price Adjustment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Adjustment ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={field.priceAdjustment ? field.priceAdjustment / 100 : ''}
                onChange={(e) =>
                  onUpdate({
                    priceAdjustment: e.target.value
                      ? Math.round(parseFloat(e.target.value) * 100)
                      : undefined,
                  })
                }
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Extra charge for this personalization
              </p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
