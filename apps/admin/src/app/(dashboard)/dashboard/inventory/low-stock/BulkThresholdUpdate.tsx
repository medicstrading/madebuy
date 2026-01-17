'use client'

import type { LowStockPiece } from '@madebuy/db'
import { Loader2, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface BulkThresholdUpdateProps {
  pieces: LowStockPiece[]
}

export function BulkThresholdUpdate({ pieces }: BulkThresholdUpdateProps) {
  const router = useRouter()
  const [thresholds, setThresholds] = useState<Record<string, number | ''>>(
    () => {
      const initial: Record<string, number | ''> = {}
      pieces.forEach((piece) => {
        initial[piece.id] = piece.lowStockThreshold
      })
      return initial
    },
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Check if any thresholds have been modified
  const hasChanges = pieces.some((piece) => {
    const current = thresholds[piece.id]
    return current !== piece.lowStockThreshold && current !== ''
  })

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Only include pieces where threshold has changed
      const updates = pieces
        .filter((piece) => {
          const current = thresholds[piece.id]
          return current !== piece.lowStockThreshold && current !== ''
        })
        .map((piece) => ({
          pieceId: piece.id,
          threshold: thresholds[piece.id] as number,
        }))

      if (updates.length === 0) {
        setMessage({ type: 'error', text: 'No changes to save' })
        setSaving(false)
        return
      }

      const response = await fetch('/api/pieces/bulk-thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        throw new Error('Failed to update thresholds')
      }

      const result = await response.json()
      setMessage({
        type: 'success',
        text: `Updated ${result.modifiedCount} item(s)`,
      })
      router.refresh()
    } catch (_error) {
      setMessage({ type: 'error', text: 'Failed to update thresholds' })
    } finally {
      setSaving(false)
    }
  }

  if (pieces.length === 0) return null

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Update Restock Thresholds
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Adjust the low stock thresholds for your items. You&apos;ll receive
        alerts when stock falls to or below these levels.
      </p>

      <div className="space-y-3 mb-6">
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{piece.name}</p>
              <p className="text-xs text-gray-500">
                Current stock:{' '}
                <span
                  className={
                    piece.stock === 0
                      ? 'text-red-600 font-semibold'
                      : 'text-amber-600 font-semibold'
                  }
                >
                  {piece.stock}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Threshold:</label>
              <input
                type="number"
                min="0"
                value={thresholds[piece.id]}
                onChange={(e) => {
                  const value =
                    e.target.value === '' ? '' : parseInt(e.target.value, 10)
                  setThresholds((prev) => ({ ...prev, [piece.id]: value }))
                }}
                className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}
