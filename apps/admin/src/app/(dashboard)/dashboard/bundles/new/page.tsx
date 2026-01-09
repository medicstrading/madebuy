import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BundleBuilder } from '@/components/bundles/BundleBuilder'

export default function NewBundlePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/bundles"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Bundle</h1>
          <p className="text-gray-500 mt-1">Combine products for a discounted price</p>
        </div>
      </div>

      <BundleBuilder />
    </div>
  )
}
