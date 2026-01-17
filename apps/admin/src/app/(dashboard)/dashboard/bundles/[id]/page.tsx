'use client'

import type { Bundle } from '@madebuy/shared'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { BundleBuilder } from '@/components/bundles/BundleBuilder'

export default function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBundle() {
      try {
        const res = await fetch(`/api/bundles/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Bundle not found')
          } else {
            setError('Failed to load bundle')
          }
          return
        }
        const data = await res.json()
        setBundle(data.bundle)
      } catch (err) {
        console.error('Failed to fetch bundle:', err)
        setError('Failed to load bundle')
      } finally {
        setLoading(false)
      }
    }

    fetchBundle()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !bundle) {
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
            <h1 className="text-2xl font-bold text-gray-900">Edit Bundle</h1>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Bundle not found'}
        </div>
      </div>
    )
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Edit Bundle</h1>
          <p className="text-gray-500 mt-1">
            Update bundle details and products
          </p>
        </div>
      </div>

      <BundleBuilder bundle={bundle} />
    </div>
  )
}
