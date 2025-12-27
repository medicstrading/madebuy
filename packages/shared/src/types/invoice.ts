import type { MaterialUnit } from './material'

/**
 * InvoiceRecord - Scanned supplier invoice with OCR results
 */
export interface InvoiceRecord {
  id: string
  tenantId: string

  // File information
  uploadedAt: Date
  fileName: string
  fileUrl: string // R2 storage URL

  // Invoice metadata
  supplier?: string
  totalAmount?: number
  currency?: string
  invoiceDate?: Date

  // OCR processing
  status: 'pending' | 'processed' | 'error'
  ocrConfidence?: number
  errorMessage?: string

  // Extracted line items
  lineItems: InvoiceLineItem[]

  // Mapping results
  materialIds: string[] // Created/updated material IDs

  createdAt: Date
  updatedAt: Date
}

/**
 * InvoiceLineItem - Individual line item extracted from invoice
 */
export interface InvoiceLineItem {
  // Raw OCR data
  extractedText: string // Full text line from OCR
  confidence?: number // OCR confidence (0-100)

  // Parsed fields
  parsedName?: string
  parsedPrice?: number
  parsedQuantity?: number
  parsedUnit?: MaterialUnit

  // User mapping decision
  materialId?: string // If mapped to existing material
  action?: 'create' | 'update' | 'skip'
}

/**
 * CreateInvoiceInput - Input for creating a new invoice record
 */
export interface CreateInvoiceInput {
  fileName: string
  fileUrl: string
  supplier?: string
  totalAmount?: number
  currency?: string
  invoiceDate?: Date
}

/**
 * UpdateInvoiceInput - Input for updating invoice with OCR results
 */
export interface UpdateInvoiceInput {
  status?: 'pending' | 'processed' | 'error'
  ocrConfidence?: number
  errorMessage?: string
  lineItems?: InvoiceLineItem[]
  materialIds?: string[]
  supplier?: string
  totalAmount?: number
  currency?: string
  invoiceDate?: Date
}

/**
 * InvoiceFilters - Query filters for listing invoices
 */
export interface InvoiceFilters {
  status?: 'pending' | 'processed' | 'error'
  supplier?: string
  dateFrom?: Date
  dateTo?: Date
}
