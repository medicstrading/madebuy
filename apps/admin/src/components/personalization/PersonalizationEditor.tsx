'use client'

import type {
  PersonalizationConfig,
  PersonalizationField,
  PersonalizationFieldType,
} from '@madebuy/shared'
import {
  AlignLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Hash,
  HelpCircle,
  List,
  Plus,
  Settings,
  ToggleLeft,
  Trash2,
  Type,
  Upload,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { useCallback, useState } from 'react'

// Field type configuration
const FIELD_TYPES: {
  type: PersonalizationFieldType
  label: string
  icon: React.ReactNode
  description: string
}[] = [
  {
    type: 'text',
    label: 'Text',
    icon: <Type className="h-4 w-4" />,
    description: 'Single line text input',
  },
  {
    type: 'textarea',
    label: 'Long Text',
    icon: <AlignLeft className="h-4 w-4" />,
    description: 'Multi-line text input',
  },
  {
    type: 'select',
    label: 'Dropdown',
    icon: <List className="h-4 w-4" />,
    description: 'Selection from options',
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: <ToggleLeft className="h-4 w-4" />,
    description: 'Yes/No toggle',
  },
  {
    type: 'file',
    label: 'File Upload',
    icon: <Upload className="h-4 w-4" />,
    description: 'Image or file upload',
  },
  {
    type: 'date',
    label: 'Date',
    icon: <Calendar className="h-4 w-4" />,
    description: 'Date picker',
  },
  {
    type: 'number',
    label: 'Number',
    icon: <Hash className="h-4 w-4" />,
    description: 'Numeric input',
  },
]

interface PersonalizationEditorProps {
  config: PersonalizationConfig
  onChange: (config: PersonalizationConfig) => void
  piecePrice?: number // Base price for percentage calculations (in cents)
}

export function PersonalizationEditor({
  config,
  onChange,
  piecePrice = 0,
}: PersonalizationEditorProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [showPreview, setShowPreview] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [testValues, setTestValues] = useState<
    Record<string, string | number | boolean>
  >({})

  // Toggle field expansion
  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev)
      if (next.has(fieldId)) {
        next.delete(fieldId)
      } else {
        next.add(fieldId)
      }
      return next
    })
  }

  // Add new field
  const addField = useCallback(
    (type: PersonalizationFieldType) => {
      const newField: PersonalizationField = {
        id: nanoid(10),
        name: '',
        type,
        required: false,
        displayOrder: config.fields.length,
        placeholder: '',
        helpText: '',
      }

      // Set type-specific defaults
      if (type === 'select') {
        newField.options = ['Option 1', 'Option 2']
      } else if (type === 'text') {
        newField.maxLength = 100
      } else if (type === 'textarea') {
        newField.maxLength = 500
      } else if (type === 'file') {
        newField.acceptedFileTypes = ['image/jpeg', 'image/png']
        newField.maxFileSizeMB = 5
      } else if (type === 'number') {
        newField.min = 0
        newField.step = 1
      }

      onChange({
        ...config,
        fields: [...config.fields, newField],
      })

      // Expand the new field
      setExpandedFields((prev) => new Set([...prev, newField.id]))
    },
    [config, onChange],
  )

  // Remove field
  const removeField = useCallback(
    (fieldId: string) => {
      onChange({
        ...config,
        fields: config.fields.filter((f) => f.id !== fieldId),
      })
      setExpandedFields((prev) => {
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    },
    [config, onChange],
  )

  // Update field
  const updateField = useCallback(
    (fieldId: string, updates: Partial<PersonalizationField>) => {
      onChange({
        ...config,
        fields: config.fields.map((f) =>
          f.id === fieldId ? { ...f, ...updates } : f,
        ),
      })
    },
    [config, onChange],
  )

  // Move field up/down
  const moveField = useCallback(
    (fieldId: string, direction: 'up' | 'down') => {
      const fieldIndex = config.fields.findIndex((f) => f.id === fieldId)
      if (fieldIndex === -1) return

      const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1
      if (newIndex < 0 || newIndex >= config.fields.length) return

      const newFields = [...config.fields]
      const [removed] = newFields.splice(fieldIndex, 1)
      newFields.splice(newIndex, 0, removed)

      // Update display orders
      newFields.forEach((field, index) => {
        field.displayOrder = index
      })

      onChange({ ...config, fields: newFields })
    },
    [config, onChange],
  )

  // Toggle enabled
  const toggleEnabled = useCallback(() => {
    onChange({ ...config, enabled: !config.enabled })
  }, [config, onChange])

  // Update config settings
  const updateConfig = useCallback(
    (updates: Partial<PersonalizationConfig>) => {
      onChange({ ...config, ...updates })
    },
    [config, onChange],
  )

  // Calculate test price adjustment
  const calculateTestPriceAdjustment = () => {
    let total = 0
    config.fields.forEach((field) => {
      const value = testValues[field.id]
      if (value !== undefined && value !== '' && field.priceAdjustment) {
        if (field.priceAdjustmentType === 'percentage') {
          total += Math.round(piecePrice * (field.priceAdjustment / 100))
        } else {
          total += field.priceAdjustment
        }
      }
    })
    return total
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={toggleEnabled}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300" />
          </label>
          <span className="text-sm font-medium text-gray-900">
            {config.enabled
              ? 'Personalization Enabled'
              : 'Personalization Disabled'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
                        
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          {showPreview && (
            <button
                            
              onClick={() => setTestMode(!testMode)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                testMode
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              <Settings className="h-4 w-4" />
              Test Mode
            </button>
          )}
        </div>
      </div>

      {/* Config Settings */}
      {config.enabled && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Settings</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Extra Processing Days
              </label>
              <input
                type="number"
                value={config.processingDays || 0}
                onChange={(e) =>
                  updateConfig({
                    processingDays: parseInt(e.target.value, 10) || 0,
                  })
                }
                min="0"
                max="365"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Added to standard processing time
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <input
                  type="checkbox"
                  checked={config.previewEnabled || false}
                  onChange={(e) =>
                    updateConfig({ previewEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Enable Live Preview
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Show preview to buyers as they fill in fields
              </p>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm text-gray-600 mb-1">
                Instructions for Buyers
              </label>
              <textarea
                value={config.instructions || ''}
                onChange={(e) => updateConfig({ instructions: e.target.value })}
                rows={2}
                maxLength={1000}
                placeholder="Add any special instructions for buyers filling out this form..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      {config.enabled && (
        <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
          {/* Fields Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Personalization Fields
              </h3>
              <span className="text-sm text-gray-500">
                {config.fields.length} field(s)
              </span>
            </div>

            {/* Field List */}
            {config.fields.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <Settings className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  No fields yet. Add a field to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {config.fields.map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    isExpanded={expandedFields.has(field.id)}
                    onToggleExpand={() => toggleFieldExpanded(field.id)}
                    onUpdate={(updates) => updateField(field.id, updates)}
                    onRemove={() => removeField(field.id)}
                    onMoveUp={() => moveField(field.id, 'up')}
                    onMoveDown={() => moveField(field.id, 'down')}
                    canMoveUp={index > 0}
                    canMoveDown={index < config.fields.length - 1}
                  />
                ))}
              </div>
            )}

            {/* Add Field Buttons */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Add Field
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {FIELD_TYPES.map(({ type, label, icon }) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => addField(type)}
                    className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-gray-600">{icon}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {testMode ? 'Test Mode' : 'Preview'}
              </h3>

              {config.instructions && (
                <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm text-blue-800">{config.instructions}</p>
                </div>
              )}

              {config.fields.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Add fields to see preview
                </p>
              ) : (
                <div className="space-y-4">
                  {config.fields.map((field) => (
                    <PreviewField
                      key={field.id}
                      field={field}
                      testMode={testMode}
                      value={testValues[field.id]}
                      onChange={(value) =>
                        setTestValues((prev) => ({
                          ...prev,
                          [field.id]: value,
                        }))
                      }
                    />
                  ))}

                  {testMode && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          Price Adjustment:
                        </span>
                        <span className="text-lg font-semibold text-blue-600">
                          +${(calculateTestPriceAdjustment() / 100).toFixed(2)}
                        </span>
                      </div>
                      {piecePrice > 0 && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-gray-500">
                            New Total:
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            $
                            {(
                              (piecePrice + calculateTestPriceAdjustment()) /
                              100
                            ).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Individual Field Editor Component
interface FieldEditorProps {
  field: PersonalizationField
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<PersonalizationField>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function FieldEditor({
  field,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: FieldEditorProps) {
  const fieldTypeConfig = FIELD_TYPES.find((t) => t.type === field.type)

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-gray-600">{fieldTypeConfig?.icon}</span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {field.name || `New ${fieldTypeConfig?.label || 'Field'}`}
          </span>
          {field.required && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
          {field.priceAdjustment ? (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              +$
              {field.priceAdjustmentType === 'percentage'
                ? `${field.priceAdjustment}%`
                : (field.priceAdjustment / 100).toFixed(2)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <button
                        
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
                        
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
                        
            onClick={onToggleExpand}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
                        
            onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name *
              </label>
              <input
                type="text"
                value={field.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="e.g., Engraving Text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Required
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder Text
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="e.g., Enter your text here..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Help Text
              </label>
              <input
                type="text"
                value={field.helpText || ''}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                placeholder="e.g., Max 20 characters, letters only"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type-specific settings */}
          <TypeSpecificSettings field={field} onUpdate={onUpdate} />

          {/* Price Adjustment */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              Price Adjustment
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </h5>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={field.priceAdjustment || ''}
                  onChange={(e) =>
                    onUpdate({
                      priceAdjustment: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  min="0"
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={field.priceAdjustmentType || 'fixed'}
                  onChange={(e) =>
                    onUpdate({
                      priceAdjustmentType: e.target.value as
                        | 'fixed'
                        | 'percentage',
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fixed (cents)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div className="flex items-end">
                {field.priceAdjustment ? (
                  <p className="text-sm text-green-600 font-medium">
                    Adds +$
                    {field.priceAdjustmentType === 'percentage'
                      ? `${field.priceAdjustment}%`
                      : (field.priceAdjustment / 100).toFixed(2)}{' '}
                    to price
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No additional charge</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Type-specific settings component
interface TypeSpecificSettingsProps {
  field: PersonalizationField
  onUpdate: (updates: Partial<PersonalizationField>) => void
}

function TypeSpecificSettings({ field, onUpdate }: TypeSpecificSettingsProps) {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Length
            </label>
            <input
              type="number"
              value={field.minLength || ''}
              onChange={(e) =>
                onUpdate({
                  minLength: parseInt(e.target.value, 10) || undefined,
                })
              }
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Length
            </label>
            <input
              type="number"
              value={field.maxLength || ''}
              onChange={(e) =>
                onUpdate({
                  maxLength: parseInt(e.target.value, 10) || undefined,
                })
              }
              min="1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern (Regex)
            </label>
            <input
              type="text"
              value={field.pattern || ''}
              onChange={(e) =>
                onUpdate({ pattern: e.target.value || undefined })
              }
              placeholder="e.g., ^[A-Za-z ]+$"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {field.pattern && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pattern Error Message
              </label>
              <input
                type="text"
                value={field.patternError || ''}
                onChange={(e) =>
                  onUpdate({ patternError: e.target.value || undefined })
                }
                placeholder="e.g., Only letters and spaces allowed"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      )

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Options
          </label>
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])]
                    newOptions[index] = e.target.value
                    onUpdate({ options: newOptions })
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                                    
                  onClick={() => {
                    const newOptions = (field.options || []).filter(
                      (_, i) => i !== index,
                    )
                    onUpdate({ options: newOptions })
                  }}
                  className="p-2 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
                            
              onClick={() => {
                const newOptions = [
                  ...(field.options || []),
                  `Option ${(field.options?.length || 0) + 1}`,
                ]
                onUpdate({ options: newOptions })
              }}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Option
            </button>
          </div>
        </div>
      )

    case 'number':
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum
            </label>
            <input
              type="number"
              value={field.min ?? ''}
              onChange={(e) =>
                onUpdate({
                  min: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum
            </label>
            <input
              type="number"
              value={field.max ?? ''}
              onChange={(e) =>
                onUpdate({
                  max: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  step: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              min="0.01"
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )

    case 'file':
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accepted File Types
            </label>
            <select
              value={(field.acceptedFileTypes || []).join(',')}
              onChange={(e) =>
                onUpdate({
                  acceptedFileTypes: e.target.value.split(',').filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="image/jpeg,image/png">Images (JPEG, PNG)</option>
              <option value="image/jpeg,image/png,image/gif,image/webp">
                Images (All)
              </option>
              <option value="application/pdf">PDF</option>
              <option value="image/jpeg,image/png,application/pdf">
                Images + PDF
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max File Size (MB)
            </label>
            <input
              type="number"
              value={field.maxFileSizeMB || ''}
              onChange={(e) =>
                onUpdate({
                  maxFileSizeMB: parseFloat(e.target.value) || undefined,
                })
              }
              min="0.1"
              max="50"
              step="0.1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )

    case 'date':
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Date
            </label>
            <input
              type="date"
              value={field.minDate || ''}
              onChange={(e) =>
                onUpdate({ minDate: e.target.value || undefined })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Date
            </label>
            <input
              type="date"
              value={field.maxDate || ''}
              onChange={(e) =>
                onUpdate({ maxDate: e.target.value || undefined })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )

    default:
      return null
  }
}

// Preview Field Component
interface PreviewFieldProps {
  field: PersonalizationField
  testMode: boolean
  value: string | number | boolean | undefined
  onChange: (value: string | number | boolean) => void
}

function PreviewField({ field, testMode, value, onChange }: PreviewFieldProps) {
  const inputId = `preview-${field.id}`

  const renderInput = () => {
    const commonClasses = testMode
      ? 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
      : 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed'

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            id={inputId}
            value={testMode ? (value as string) || '' : ''}
            onChange={(e) => testMode && onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            disabled={!testMode}
            className={commonClasses}
          />
        )

      case 'textarea':
        return (
          <textarea
            id={inputId}
            value={testMode ? (value as string) || '' : ''}
            onChange={(e) => testMode && onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={3}
            disabled={!testMode}
            className={commonClasses}
          />
        )

      case 'select':
        return (
          <select
            id={inputId}
            value={testMode ? (value as string) || '' : ''}
            onChange={(e) => testMode && onChange(e.target.value)}
            disabled={!testMode}
            className={commonClasses}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id={inputId}
              checked={testMode ? (value as boolean) || false : false}
              onChange={(e) => testMode && onChange(e.target.checked)}
              disabled={!testMode}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
        )

      case 'file':
        return (
          <div
            className={`rounded-lg border-2 border-dashed ${testMode ? 'border-gray-300 hover:border-blue-400' : 'border-gray-200 bg-gray-50'} p-4 text-center`}
          >
            <Upload
              className={`mx-auto h-6 w-6 ${testMode ? 'text-gray-400' : 'text-gray-300'}`}
            />
            <p
              className={`mt-1 text-sm ${testMode ? 'text-gray-600' : 'text-gray-400'}`}
            >
              {testMode ? 'Click or drag to upload' : 'File upload area'}
            </p>
            {field.maxFileSizeMB && (
              <p className="text-xs text-gray-400 mt-1">
                Max {field.maxFileSizeMB}MB
              </p>
            )}
          </div>
        )

      case 'date':
        return (
          <input
            type="date"
            id={inputId}
            value={testMode ? (value as string) || '' : ''}
            onChange={(e) => testMode && onChange(e.target.value)}
            min={field.minDate}
            max={field.maxDate}
            disabled={!testMode}
            className={commonClasses}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            id={inputId}
            value={testMode ? (value as number) || '' : ''}
            onChange={(e) =>
              testMode && onChange(parseFloat(e.target.value) || 0)
            }
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={!testMode}
            className={commonClasses}
          />
        )

      default:
        return null
    }
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {field.name || 'Untitled Field'}
        {field.required && <span className="text-red-500 ml-1">*</span>}
        {field.priceAdjustment ? (
          <span className="ml-2 text-xs font-normal text-green-600">
            (+$
            {field.priceAdjustmentType === 'percentage'
              ? `${field.priceAdjustment}%`
              : (field.priceAdjustment / 100).toFixed(2)}
            )
          </span>
        ) : null}
      </label>
      {renderInput()}
      {field.helpText && (
        <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
      )}
      {field.type === 'text' || field.type === 'textarea'
        ? field.maxLength &&
          testMode && (
            <p className="mt-1 text-xs text-gray-400 text-right">
              {((value as string) || '').length}/{field.maxLength}
            </p>
          )
        : null}
    </div>
  )
}

export default PersonalizationEditor
