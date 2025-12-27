'use client'

import { useState, createContext, useContext } from 'react'
import { Plus } from 'lucide-react'
import { MediaUploadModal } from './MediaUploadModal'
import { LinkMediaModal } from './LinkMediaModal'
import type { Piece } from '@madebuy/shared'

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

export function MediaLibraryClient({ children, piecesData }: MediaLibraryClientProps) {
  const [showUploadModal, setShowUploadModal] = useState(false)
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

  return (
    <MediaLibraryContext.Provider value={{ openLinkModal }}>
      <div>
        {/* Upload Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
            <p className="mt-2 text-gray-600">Organize media by inventory pieces</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Upload Media
          </button>
        </div>

        {/* Content from server component */}
        {children}

        {/* Upload Modal */}
        <MediaUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
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
