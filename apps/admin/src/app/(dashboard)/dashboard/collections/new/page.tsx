import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CollectionForm } from '@/components/collections/CollectionForm'

export default function NewCollectionPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Create Collection</h1>
          <p className="text-gray-500 mt-1">Group products into a themed collection</p>
        </div>
      </div>

      <CollectionForm />
    </div>
  )
}
