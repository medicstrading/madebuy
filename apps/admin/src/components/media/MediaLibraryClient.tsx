'use client'

import type { Piece } from '@madebuy/shared'
import { Plus, Upload } from 'lucide-react'
import { createContext, useContext, useState } from 'react'
import { BulkUploadModal } from './BulkUploadModal'
import { LinkMediaModal } from './LinkMediaModal'
import { MediaUploadModal } from './MediaUploadModal'

interface PieceWithCount {
  piece: Piece
  mediaCount: number
}

interface MediaLibraryContextValue {
  openLinkModal: (mediaId: string) => void
}

const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(null)

export function useMediaLibrary() {
  const context = useContext(MediaLibraryContext)
  if (!context) {
    throw new Error('useMediaLibrary must be used within MediaLibraryClient')
  }
  return context
}

interface MediaLibraryClientProps {
  children: React.ReactNode
  piecesData: PieceWithCount[]
}

export function MediaLibraryClient({
  children,
  piecesData,
}: MediaLibraryClientProps) {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)

  const openLinkModal = (mediaId: string) => {
    setSelectedMediaId(mediaId)
    setShowLinkModal(true)
  }

  const closeLinkModal = () => {
    setShowLinkModal(false)
    setSelectedMediaId(null)
  }

  // Extract just the pieces for bulk upload
  const pieces = piecesData.map((pd) => pd.piece)

  return (
    <MediaLibraryContext.Provider value={{ openLinkModal }}>
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
            <p className="mt-2 text-gray-600">
              Organize media by inventory pieces
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBulkUploadModal(true)}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </button>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Upload
            </button>
          </div>
        </div>

        {/* Content from server component */}
        {children}

        {/* Simple Upload Modal */}
        <MediaUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          pieces={pieces}
        />

        {/* Link Media Modal */}
        {selectedMediaId && (
          <LinkMediaModal
            isOpen={showLinkModal}
            onClose={closeLinkModal}
            mediaId={selectedMediaId}
            pieces={piecesData}
          />
        )}
      </div>
    </MediaLibraryContext.Provider>
  )
}
