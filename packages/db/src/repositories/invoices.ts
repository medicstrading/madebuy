import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  InvoiceRecord,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceFilters,
} from '@madebuy/shared'

/** Escape special regex characters to prevent ReDoS attacks */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Database record type
interface InvoiceDbRecord extends InvoiceRecord {
  _id?: unknown
}

/**
 * Create a new invoice record
 */
export async function createInvoice(
  tenantId: string,
  data: CreateInvoiceInput
): Promise<InvoiceRecord> {
  const db = await getDatabase()

  const invoice: InvoiceRecord = {
    id: nanoid(),
    tenantId,
    uploadedAt: new Date(),
    fileName: data.fileName,
    fileUrl: data.fileUrl,
    supplier: data.supplier,
    totalAmount: data.totalAmount,
    currency: data.currency || 'AUD',
    invoiceDate: data.invoiceDate,
    status: 'pending',
    lineItems: [],
    materialIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection('invoices').insertOne(invoice)
  return invoice
}

/**
 * Get invoice by ID
 */
export async function getInvoice(
  tenantId: string,
  id: string
): Promise<InvoiceRecord | null> {
  const db = await getDatabase()
  return await db.collection('invoices').findOne({ tenantId, id }) as InvoiceRecord | null
}

/**
 * List invoices with optional filters
 */
export async function listInvoices(
  tenantId: string,
  filters?: InvoiceFilters
): Promise<InvoiceRecord[]> {
  const db = await getDatabase()

  const query: Record<string, unknown> = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.supplier) {
    query.supplier = { $regex: escapeRegex(filters.supplier), $options: 'i' }
  }

  if (filters?.dateFrom || filters?.dateTo) {
    const dateQuery: Record<string, Date> = {}
    if (filters.dateFrom) {
      dateQuery.$gte = filters.dateFrom
    }
    if (filters.dateTo) {
      dateQuery.$lte = filters.dateTo
    }
    query.uploadedAt = dateQuery
  }

  const results = await db.collection('invoices')
    .find(query)
    .sort({ uploadedAt: -1 })
    .toArray()

  return results as unknown as InvoiceRecord[]
}

/**
 * Update invoice with OCR results or processing status
 */
export async function updateInvoice(
  tenantId: string,
  id: string,
  updates: UpdateInvoiceInput
): Promise<void> {
  const db = await getDatabase()

  await db.collection('invoices').updateOne(
    { tenantId, id },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      }
    }
  )
}

/**
 * Delete invoice
 */
export async function deleteInvoice(
  tenantId: string,
  id: string
): Promise<void> {
  const db = await getDatabase()
  await db.collection('invoices').deleteOne({ tenantId, id })
}

/**
 * Get recent invoices (last 30 days)
 */
export async function getRecentInvoices(
  tenantId: string,
  limit: number = 10
): Promise<InvoiceRecord[]> {
  const db = await getDatabase()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const results = await db.collection('invoices')
    .find({
      tenantId,
      uploadedAt: { $gte: thirtyDaysAgo }
    })
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .toArray()

  return results as unknown as InvoiceRecord[]
}

/**
 * Get invoices by supplier
 */
export async function getInvoicesBySupplier(
  tenantId: string,
  supplier: string
): Promise<InvoiceRecord[]> {
  const db = await getDatabase()

  const results = await db.collection('invoices')
    .find({
      tenantId,
      supplier: { $regex: escapeRegex(supplier), $options: 'i' }
    })
    .sort({ uploadedAt: -1 })
    .toArray()

  return results as unknown as InvoiceRecord[]
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(tenantId: string): Promise<{
  totalInvoices: number
  processedCount: number
  pendingCount: number
  errorCount: number
  totalSpent: number
}> {
  const db = await getDatabase()

  const invoices = await db.collection('invoices')
    .find({ tenantId })
    .toArray() as InvoiceDbRecord[]

  const stats = {
    totalInvoices: invoices.length,
    processedCount: invoices.filter((inv) => inv.status === 'processed').length,
    pendingCount: invoices.filter((inv) => inv.status === 'pending').length,
    errorCount: invoices.filter((inv) => inv.status === 'error').length,
    totalSpent: invoices
      .filter((inv) => inv.totalAmount && inv.status === 'processed')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
  }

  return stats
}
