import { nanoid } from 'nanoid'
import { getDatabase } from '../client'
import type {
  InvoiceRecord,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceFilters,
} from '@madebuy/shared'

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

  const query: any = { tenantId }

  if (filters?.status) {
    query.status = filters.status
  }

  if (filters?.supplier) {
    query.supplier = { $regex: filters.supplier, $options: 'i' }
  }

  if (filters?.dateFrom || filters?.dateTo) {
    query.uploadedAt = {}
    if (filters.dateFrom) {
      query.uploadedAt.$gte = filters.dateFrom
    }
    if (filters.dateTo) {
      query.uploadedAt.$lte = filters.dateTo
    }
  }

  const results = await db.collection('invoices')
    .find(query)
    .sort({ uploadedAt: -1 })
    .toArray()

  return results as any[]
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

  return results as any[]
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
      supplier: { $regex: supplier, $options: 'i' }
    })
    .sort({ uploadedAt: -1 })
    .toArray()

  return results as any[]
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
    .toArray() as any[]

  const stats = {
    totalInvoices: invoices.length,
    processedCount: invoices.filter((inv: any) => inv.status === 'processed').length,
    pendingCount: invoices.filter((inv: any) => inv.status === 'pending').length,
    errorCount: invoices.filter((inv: any) => inv.status === 'error').length,
    totalSpent: invoices
      .filter((inv: any) => inv.totalAmount && inv.status === 'processed')
      .reduce((sum: number, inv: any) => sum + inv.totalAmount, 0)
  }

  return stats
}
