/**
 * CSV Import Types for MadeBuy
 * Supports bulk product import from CSV files
 */

export type ImportJobStatus =
  | 'uploaded' // File uploaded, waiting for validation
  | 'validating' // Validation in progress
  | 'validated' // Validation complete, ready for import
  | 'processing' // Import in progress
  | 'completed' // Import finished successfully
  | 'failed' // Import failed with errors
  | 'cancelled' // Import cancelled by user

export type ImportSource =
  | 'madebuy'
  | 'shopify'
  | 'etsy'
  | 'woocommerce'
  | 'custom'

/**
 * ImportJob - Tracks a CSV import operation
 */
export interface ImportJob {
  id: string
  tenantId: string
  status: ImportJobStatus
  source: ImportSource

  // File info
  filename: string
  fileKey: string // R2 storage key
  fileSize: number // in bytes
  rowCount: number

  // Column mapping (for custom imports)
  columnMapping?: ColumnMapping

  // Validation results
  validatedAt?: Date
  preview?: ImportPreview
  errors: ImportError[]
  warnings: ImportWarning[]

  // Processing results
  startedAt?: Date
  completedAt?: Date
  productsCreated: number
  productsUpdated: number
  productsSkipped: number
  imagesDownloaded: number

  // Configuration
  updateExisting: boolean // Update products that already exist (match by handle/SKU)
  skipErrors: boolean // Continue importing even if some rows fail

  createdAt: Date
  updatedAt: Date
}

/**
 * Column mapping for custom imports
 */
export interface ColumnMapping {
  handle?: string // Column name that maps to handle/slug
  name?: string // Column name that maps to product name
  description?: string
  price?: string
  stock?: string
  category?: string
  tags?: string
  status?: string
  sku?: string
  imageUrl?: string
  imagePosition?: string
}

/**
 * Import preview data
 */
export interface ImportPreview {
  totalRows: number
  productsDetected: number
  variantsDetected: number
  imagesDetected: number
  detectedSource: ImportSource
  sampleRows: ParsedRow[] // First 5 rows for preview
  detectedColumns: string[]
  suggestedMapping?: ColumnMapping
}

/**
 * Parsed row from CSV
 */
export interface ParsedRow {
  rowNumber: number
  handle?: string
  name?: string
  description?: string
  price?: number
  currency?: string
  stock?: number
  category?: string
  tags?: string[]
  status?: string
  sku?: string
  imageUrl?: string
  imagePosition?: number
  raw: Record<string, string> // Original row data
}

/**
 * Import error
 */
export interface ImportError {
  row: number
  column?: string
  message: string
  value?: string
}

/**
 * Import warning (non-blocking)
 */
export interface ImportWarning {
  row: number
  column?: string
  message: string
}

/**
 * Input for creating an import job
 */
export interface CreateImportJobInput {
  tenantId: string
  filename: string
  fileKey: string
  fileSize: number
  source?: ImportSource
  updateExisting?: boolean
  skipErrors?: boolean
}

/**
 * Input for updating an import job
 */
export interface UpdateImportJobInput {
  status?: ImportJobStatus
  rowCount?: number
  columnMapping?: ColumnMapping
  validatedAt?: Date
  preview?: ImportPreview
  errors?: ImportError[]
  warnings?: ImportWarning[]
  startedAt?: Date
  completedAt?: Date
  productsCreated?: number
  productsUpdated?: number
  productsSkipped?: number
  imagesDownloaded?: number
  updateExisting?: boolean
  skipErrors?: boolean
}

/**
 * Standard CSV columns for MadeBuy format
 */
export const MADEBUY_CSV_COLUMNS = [
  'handle',
  'name',
  'description',
  'price',
  'currency',
  'stock',
  'lowStockThreshold',
  'category',
  'tags',
  'status',
  'sku',
  'materials',
  'imageSrc',
  'imagePosition',
  'weight',
  'length',
  'width',
  'height',
] as const

/**
 * Required columns for import
 */
export const REQUIRED_COLUMNS = ['handle', 'name'] as const

/**
 * Valid product statuses
 */
export const VALID_STATUSES = [
  'draft',
  'available',
  'sold',
  'reserved',
  'archived',
] as const
