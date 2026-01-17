'use client'

import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

interface LineItem {
  extractedText: string
  parsedName?: string
  parsedPrice?: number
  parsedQuantity?: number
  parsedUnit?: string
  confidence?: number
  materialId?: string
  action?: 'create' | 'update' | 'skip'
}

interface InvoiceData {
  id: string
  fileName: string
  supplier?: string
  lineItems: LineItem[]
}

export default function InvoiceReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceId = searchParams?.get('invoiceId')
  const { toasts, removeToast, success, error: showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!invoiceId) {
      setError('No invoice ID provided')
      setLoading(false)
      return
    }

    fetch(`/api/invoices/${invoiceId}`)
      .then((res) => res.json())
      .then((data) => {
        setInvoice(data)
        setItems(data.lineItems || [])
        setLoading(false)
      })
      .catch((_err) => {
        setError('Failed to load invoice')
        setLoading(false)
      })
  }, [invoiceId])

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleConfirm = async () => {
    if (!invoiceId) return

    const itemsToSave = items.filter((item) => item.action !== 'skip')

    if (itemsToSave.length === 0) {
      showError('Please select at least one item to save')
      return
    }

    // Validate items
    const invalidItems = itemsToSave.filter(
      (item) => !item.parsedName || !item.parsedPrice || !item.parsedQuantity,
    )

    if (invalidItems.length > 0) {
      showError('Please fill in name, price, and quantity for all items')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const res = await fetch('/api/materials/invoice-scan/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          confirmedLineItems: itemsToSave,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save materials')
      }

      const result = await res.json()
      success(
        `Successfully created ${result.materialsCreated || itemsToSave.length} materials`,
      )

      setTimeout(() => {
        router.push('/dashboard/materials')
      }, 1000)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      showError(errorMessage)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="max-w-4xl mx-auto mt-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
          <p className="text-red-800">{error}</p>
          <Link
            href="/dashboard/materials/invoice-scan"
            className="mt-4 inline-block text-red-700 hover:text-red-900 underline"
          >
            Try again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/materials/invoice-scan"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Review Extracted Data
            </h1>
            <p className="text-gray-600 mt-1">
              {invoice?.fileName} {invoice?.supplier && `• ${invoice.supplier}`}
            </p>
          </div>

          {error && (
            <div className="mx-6 mt-6 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="p-6">
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-800">
                Review the extracted data below. You can edit any field, choose
                to create new materials or update existing ones, or skip items
                entirely.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Material Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr
                      key={index}
                      className={item.action === 'skip' ? 'opacity-50' : ''}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.parsedName || ''}
                          onChange={(e) =>
                            updateItem(index, 'parsedName', e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Material name"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Raw: {item.extractedText}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={item.parsedQuantity || ''}
                          onChange={(e) =>
                            updateItem(
                              index,
                              'parsedQuantity',
                              parseFloat(e.target.value),
                            )
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={item.parsedUnit || 'piece'}
                          onChange={(e) =>
                            updateItem(index, 'parsedUnit', e.target.value)
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="gram">gram</option>
                          <option value="kg">kg</option>
                          <option value="piece">piece</option>
                          <option value="meter">meter</option>
                          <option value="set">set</option>
                          <option value="ml">ml</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={item.parsedPrice || ''}
                          onChange={(e) =>
                            updateItem(
                              index,
                              'parsedPrice',
                              parseFloat(e.target.value),
                            )
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                (item.confidence || 0) >= 70
                                  ? 'bg-green-500'
                                  : (item.confidence || 0) >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${item.confidence || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {item.confidence || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={item.action || 'create'}
                          onChange={(e) =>
                            updateItem(index, 'action', e.target.value as any)
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="create">Create New</option>
                          <option value="skip">Skip</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Link
                href="/dashboard/materials/invoice-scan"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  saving ||
                  items.filter((i) => i.action !== 'skip').length === 0
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm & Save Materials
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
