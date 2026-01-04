'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CollectionForm } from '@/components/collections/CollectionForm'
import type { Collection } from '@madebuy/shared'

export default function EditCollectionPage() {
  const params = useParams()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCollection() {
      try {
        const res = await fetch(`/api/collections/${params.id}`)
        const data = await res.json()
        setCollection(data.collection)
      } catch (error) {
        console.error('Failed to fetch collection:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCollection()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Collection not found</h2>
        <Link href="/dashboard/collections" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to collections
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/collections"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Collection</h1>
          <p className="text-gray-500 mt-1">{collection.name}</p>
        </div>
      </div>

      <CollectionForm collection={collection} />
    </div>
  )
}
