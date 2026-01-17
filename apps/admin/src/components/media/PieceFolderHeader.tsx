'use client'

import type { MediaItem, Piece } from '@madebuy/shared'
import { Folder, Video, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface PieceFolderHeaderProps {
  piece: Piece
  mediaCount: number
  primaryMedia?: MediaItem
}

export function PieceFolderHeader({
  piece,
  mediaCount,
  primaryMedia,
}: PieceFolderHeaderProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${piece.name}" and all its media? This action cannot be undone.`,
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/pieces/${piece.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete piece')
      }

      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete piece. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mb-4 flex items-center gap-4">
      {primaryMedia ? (
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {primaryMedia.type === 'image' ? (
            <img
              src={
                primaryMedia.variants.thumb?.url ||
                primaryMedia.variants.original.url
              }
              alt={piece.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200">
              <Video className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <Folder className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {piece.name}
          </h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            {mediaCount}
          </span>
        </div>
        {piece.description && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-1">
            {piece.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/inventory/${piece.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View Piece
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          title={`Delete ${piece.name}`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
