'use client'

import type { Piece } from '@madebuy/shared'
import { Folder, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface LinkMediaModalProps {
  isOpen: boolean
  onClose: () => void
  mediaId: string
  pieces: Array<{ piece: Piece; mediaCount: number }>
}

export function LinkMediaModal({
  isOpen,
  onClose,
  mediaId,
  pieces,
}: LinkMediaModalProps) {
  const router = useRouter()
  const [linking, setLinking] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPieces = pieces.filter((p) =>
    p.piece.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleLink = async (pieceId: string) => {
    setLinking(true)

    try {
      const response = await fetch(`/api/pieces/${pieceId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      })

      if (!response.ok) {
        throw new Error('Failed to link media')
      }

      router.refresh()
      onClose()
    } catch (error) {
      console.error('Link error:', error)
      alert('Failed to link media. Please try again.')
    } finally {
      setLinking(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Link to Piece</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search pieces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Pieces List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredPieces.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-600">
                {searchQuery ? 'No pieces found' : 'No pieces available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPieces.map(({ piece, mediaCount }) => (
                <button
                  type="button"
                  key={piece.id}
                  onClick={() => handleLink(piece.id)}
                  disabled={linking}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 text-left"
                >
                  <div className="flex-shrink-0">
                    <Folder className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {piece.name}
                    </p>
                    {piece.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {piece.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 rounded text-xs font-medium text-gray-700">
                      {mediaCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={linking}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
