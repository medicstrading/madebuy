'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DeletePieceButtonProps {
  pieceId: string
  pieceName: string
}

export function DeletePieceButton({ pieceId, pieceName }: DeletePieceButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${pieceName}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/pieces/${pieceId}`, {
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
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
      title={`Delete ${pieceName}`}
    >
      <X className="h-5 w-5" />
    </button>
  )
}
