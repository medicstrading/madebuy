'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DeleteMaterialButtonProps {
  materialId: string
  materialName: string
}

export function DeleteMaterialButton({
  materialId,
  materialName,
}: DeleteMaterialButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${materialName}"? This action cannot be undone.`,
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete material')
      }

      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete material. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
      title={`Delete ${materialName}`}
    >
      <X className="h-5 w-5" />
    </button>
  )
}
