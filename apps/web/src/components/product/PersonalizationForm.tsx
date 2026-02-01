'use client'

import type {
  PersonalizationConfig,
  PersonalizationField,
  PersonalizationValue,
} from '@madebuy/shared'
import {
  calculatePersonalizationTotal,
  validateFieldValue,
} from '@madebuy/shared'
import {
  AlertCircle,
  CheckCircle,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface PersonalizationFormProps {
  config: PersonalizationConfig
  pieceId: string
  tenantId: string
  basePrice: number // in cents
  onValuesChange: (
    values: PersonalizationValue[],
    totalAdjustment: number,
  ) => void
  onValidationChange?: (isValid: boolean) => void
  disabled?: boolean
}

interface FieldState {
  value: string | number | boolean
  fileUrl?: string
  fileName?: string
  error?: string[]
  touched: boolean
  uploading?: boolean
}

export function PersonalizationForm({
  config,
  pieceId,
  tenantId,
  basePrice,
  onValuesChange,
  onValidationChange,
  disabled = false,
}: PersonalizationFormProps) {
  // Track field states
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(
    () => {
      const initial: Record<string, FieldState> = {}
      config.fields.forEach((field) => {
        initial[field.id] = {
          value: field.type === 'checkbox' ? false : '',
          touched: false,
        }
      })
      return initial
    },
  )

  // Calculate if form is valid
  const isFormValid = useMemo(() => {
    for (const field of config.fields) {
      const state = fieldStates[field.id]
      if (!state) continue

      // Check required fields
      if (field.required) {
        if (field.type === 'file') {
          if (!state.fileUrl) return false
        } else if (
          state.value === '' ||
          state.value === undefined ||
          state.value === null
        ) {
          return false
        }
      }

      // Check for validation errors
      if (state.error && state.error.length > 0) {
        return false
      }
    }
    return true
  }, [config.fields, fieldStates])

  // Notify parent of validation state changes
  useEffect(() => {
    onValidationChange?.(isFormValid)
  }, [isFormValid, onValidationChange])

  // Build PersonalizationValues and notify parent
  useEffect(() => {
    const values: PersonalizationValue[] = []
    const inputMap: Record<
      string,
      { value: string | number | boolean; fileUrl?: string }
    > = {}

    for (const field of config.fields) {
      const state = fieldStates[field.id]
      if (!state) continue

      // Skip empty non-required fields
      if (
        !field.required &&
        (state.value === '' || state.value === undefined)
      ) {
        continue
      }

      inputMap[field.id] = { value: state.value, fileUrl: state.fileUrl }

      // Calculate price adjustment for this field
      let priceAdjustment = 0
      if (
        field.priceAdjustment &&
        state.value !== '' &&
        state.value !== undefined &&
        state.value !== false
      ) {
        if (field.priceAdjustmentType === 'percentage') {
          priceAdjustment = Math.round(
            basePrice * (field.priceAdjustment / 100),
          )
        } else {
          priceAdjustment = field.priceAdjustment
        }
      }

      values.push({
        fieldId: field.id,
        fieldName: field.name,
        value: state.value,
        fileUrl: state.fileUrl,
        fileName: state.fileName,
        priceAdjustment,
      })
    }

    const totalAdjustment = calculatePersonalizationTotal(
      config,
      inputMap,
      basePrice,
    )
    onValuesChange(values, totalAdjustment)
  }, [fieldStates, config, basePrice, onValuesChange])

  // Update field value and validate
  const updateField = useCallback(
    (
      fieldId: string,
      value: string | number | boolean,
      fileUrl?: string,
      fileName?: string,
    ) => {
      const field = config.fields.find((f) => f.id === fieldId)
      if (!field) return

      // Validate the value
      const errors = validateFieldValue(field, value, fileUrl)

      setFieldStates((prev) => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          value,
          fileUrl,
          fileName,
          error: errors.length > 0 ? errors : undefined,
          touched: true,
        },
      }))
    },
    [config.fields],
  )

  // Handle blur (mark as touched for showing errors)
  const handleBlur = useCallback((fieldId: string) => {
    setFieldStates((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        touched: true,
      },
    }))
  }, [])

  // Sort fields by displayOrder
  const sortedFields = useMemo(() => {
    return [...config.fields].sort((a, b) => a.displayOrder - b.displayOrder)
  }, [config.fields])

  if (!config.enabled || config.fields.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Personalize This Item
      </h3>

      {config.instructions && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-100 p-3">
          <p className="text-sm text-blue-800">{config.instructions}</p>
        </div>
      )}

      {config.processingDays && config.processingDays > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            Personalized items require {config.processingDays} additional day(s)
            for processing.
          </span>
        </div>
      )}

      <div className="space-y-5">
        {sortedFields.map((field) => (
          <PersonalizationFieldInput
            key={field.id}
            field={field}
            state={fieldStates[field.id] || { value: '', touched: false }}
            pieceId={pieceId}
            tenantId={tenantId}
            disabled={disabled}
            onChange={(value, fileUrl, fileName) =>
              updateField(field.id, value, fileUrl, fileName)
            }
            onBlur={() => handleBlur(field.id)}
            onUploadStart={() => {
              setFieldStates((prev) => ({
                ...prev,
                [field.id]: { ...prev[field.id], uploading: true },
              }))
            }}
            onUploadEnd={() => {
              setFieldStates((prev) => ({
                ...prev,
                [field.id]: { ...prev[field.id], uploading: false },
              }))
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Individual field input component
interface PersonalizationFieldInputProps {
  field: PersonalizationField
  state: FieldState
  pieceId: string
  tenantId: string
  disabled: boolean
  onChange: (
    value: string | number | boolean,
    fileUrl?: string,
    fileName?: string,
  ) => void
  onBlur: () => void
  onUploadStart: () => void
  onUploadEnd: () => void
}

function PersonalizationFieldInput({
  field,
  state,
  pieceId,
  tenantId,
  disabled,
  onChange,
  onBlur,
  onUploadStart,
  onUploadEnd,
}: PersonalizationFieldInputProps) {
  const inputId = `personalization-${field.id}`
  const showError = state.touched && state.error && state.error.length > 0

  const labelClasses = 'block text-sm font-medium text-gray-700 mb-1.5'
  const inputClasses = `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
    showError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
  } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`

  const renderPriceTag = () => {
    if (!field.priceAdjustment) return null
    return (
      <span className="ml-2 text-xs font-normal text-green-600">
        (+$
        {field.priceAdjustmentType === 'percentage'
          ? `${field.priceAdjustment}%`
          : (field.priceAdjustment / 100).toFixed(2)}
        )
      </span>
    )
  }

  const renderHelpText = () => {
    if (!field.helpText) return null
    return (
      <p className="mt-1.5 text-xs text-gray-600 flex items-start gap-1">
        <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        {field.helpText}
      </p>
    )
  }

  const renderError = () => {
    if (!showError) return null
    return (
      <div className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>{state.error?.[0]}</span>
      </div>
    )
  }

  const renderCharacterCount = () => {
    if (field.type !== 'text' && field.type !== 'textarea') return null
    if (!field.maxLength) return null
    const currentLength = ((state.value as string) || '').length
    const isNearLimit = currentLength > field.maxLength * 0.8
    return (
      <p
        className={`mt-1 text-xs text-right ${isNearLimit ? 'text-amber-600' : 'text-gray-600'}`}
      >
        {currentLength}/{field.maxLength}
      </p>
    )
  }

  switch (field.type) {
    case 'text':
      return (
        <div>
          <label htmlFor={inputId} className={labelClasses}>
            {field.name}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
            {renderPriceTag()}
          </label>
          <input
            type="text"
            id={inputId}
            value={(state.value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            disabled={disabled}
            className={inputClasses}
            aria-invalid={showError}
            aria-describedby={showError ? `${inputId}-error` : undefined}
          />
          {renderCharacterCount()}
          {renderHelpText()}
          {renderError()}
        </div>
      )

    case 'textarea':
      return (
        <div>
          <label htmlFor={inputId} className={labelClasses}>
            {field.name}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
            {renderPriceTag()}
          </label>
          <textarea
            id={inputId}
            value={(state.value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={4}
            disabled={disabled}
            className={inputClasses}
            aria-invalid={showError}
            aria-describedby={showError ? `${inputId}-error` : undefined}
          />
          {renderCharacterCount()}
          {renderHelpText()}
          {renderError()}
        </div>
      )

    case 'select':
      return (
        <div>
          <label htmlFor={inputId} className={labelClasses}>
            {field.name}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
            {renderPriceTag()}
          </label>
          <select
            id={inputId}
            value={(state.value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className={inputClasses}
            aria-invalid={showError}
            aria-describedby={showError ? `${inputId}-error` : undefined}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {renderHelpText()}
          {renderError()}
        </div>
      )

    case 'checkbox':
      return (
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id={inputId}
              checked={(state.value as boolean) || false}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
              disabled={disabled}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-700">
              {field.name}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
              {renderPriceTag()}
            </span>
          </label>
          {renderHelpText()}
          {renderError()}
        </div>
      )

    case 'number':
      return (
        <div>
          <label htmlFor={inputId} className={labelClasses}>
            {field.name}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
            {renderPriceTag()}
          </label>
          <input
            type="number"
            id={inputId}
            value={(state.value as number) || ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? '' : parseFloat(e.target.value))
            }
            onBlur={onBlur}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            disabled={disabled}
            className={inputClasses}
            aria-invalid={showError}
            aria-describedby={showError ? `${inputId}-error` : undefined}
          />
          {field.min !== undefined || field.max !== undefined ? (
            <p className="mt-1 text-xs text-gray-400">
              {field.min !== undefined && field.max !== undefined
                ? `Range: ${field.min} - ${field.max}`
                : field.min !== undefined
                  ? `Minimum: ${field.min}`
                  : `Maximum: ${field.max}`}
            </p>
          ) : null}
          {renderHelpText()}
          {renderError()}
        </div>
      )

    case 'date':
      return (
        <div>
          <label htmlFor={inputId} className={labelClasses}>
            {field.name}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
            {renderPriceTag()}
          </label>
          <input
            type="date"
            id={inputId}
            value={(state.value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            min={field.minDate}
            max={field.maxDate}
            disabled={disabled}
            className={inputClasses}
            aria-invalid={showError}
            aria-describedby={showError ? `${inputId}-error` : undefined}
          />
          {renderHelpText()}
          {renderError()}
        </div>
      )

    case 'file':
      return (
        <FileUploadField
          field={field}
          state={state}
          pieceId={pieceId}
          tenantId={tenantId}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
          onUploadStart={onUploadStart}
          onUploadEnd={onUploadEnd}
          showError={showError || false}
        />
      )

    default:
      return null
  }
}

// File upload field component
interface FileUploadFieldProps {
  field: PersonalizationField
  state: FieldState
  pieceId: string
  tenantId: string
  disabled: boolean
  onChange: (
    value: string | number | boolean,
    fileUrl?: string,
    fileName?: string,
  ) => void
  onBlur: () => void
  onUploadStart: () => void
  onUploadEnd: () => void
  showError: boolean
}

function FileUploadField({
  field,
  state,
  pieceId,
  tenantId,
  disabled,
  onChange,
  onBlur,
  onUploadStart,
  onUploadEnd,
  showError,
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const acceptedTypes = field.acceptedFileTypes?.join(',') || 'image/*'
  const maxSizeBytes = (field.maxFileSizeMB || 5) * 1024 * 1024

  const isImage = (fileUrl: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl)
  }

  const handleFile = async (file: File) => {
    setUploadError(null)

    // Validate file type
    if (field.acceptedFileTypes && field.acceptedFileTypes.length > 0) {
      const isValidType = field.acceptedFileTypes.some((type) => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'))
        }
        return file.type === type
      })
      if (!isValidType) {
        setUploadError(
          `Invalid file type. Accepted: ${field.acceptedFileTypes.join(', ')}`,
        )
        return
      }
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      setUploadError(
        `File too large. Maximum size: ${field.maxFileSizeMB || 5}MB`,
      )
      return
    }

    onUploadStart()

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pieceId', pieceId)
      formData.append('fieldId', field.id)

      const response = await fetch('/api/personalization/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Upload failed')
      }

      const { url, fileName: uploadedFileName } = await response.json()
      onChange(file.name, url, uploadedFileName || file.name)
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload file',
      )
    } finally {
      onUploadEnd()
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || state.uploading) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleRemove = () => {
    onChange('', undefined, undefined)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {field.name}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
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

      {state.fileUrl ? (
        // File preview
        <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center gap-3">
            {isImage(state.fileUrl) ? (
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                <img
                  src={state.fileUrl}
                  alt="Upload preview"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {state.fileName || 'Uploaded file'}
              </p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Uploaded successfully</span>
              </div>
            </div>
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Remove file"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        // Upload area
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed transition-colors ${
            disabled || state.uploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : dragActive
                ? 'border-blue-400 bg-blue-50'
                : showError
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleInputChange}
            onBlur={onBlur}
            disabled={disabled || state.uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={`Upload file for ${field.name}`}
          />

          <div className="p-6 text-center">
            {state.uploading ? (
              <>
                <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
                <p className="mt-2 text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  {field.acceptedFileTypes?.some((t) =>
                    t.startsWith('image/'),
                  ) ? (
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  ) : (
                    <Upload className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-blue-600">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {field.acceptedFileTypes?.join(', ') || 'Any image'} up to{' '}
                  {field.maxFileSizeMB || 5}MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {field.helpText && (
        <p className="mt-1.5 text-xs text-gray-500 flex items-start gap-1">
          <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          {field.helpText}
        </p>
      )}

      {(uploadError || (showError && state.error)) && (
        <div className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{uploadError || state.error?.[0]}</span>
        </div>
      )}
    </div>
  )
}

export default PersonalizationForm
