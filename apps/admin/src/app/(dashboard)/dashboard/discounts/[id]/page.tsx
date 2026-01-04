'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DiscountForm } from '@/components/discounts/DiscountForm'
import type { DiscountCode } from '@madebuy/shared'

export default function EditDiscountPage() {
  const params = useParams()
  const [discount, setDiscount] = useState<DiscountCode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDiscount() {
      try {
        const res = await fetch(`/api/discounts/${params.id}`)
        const data = await res.json()
        setDiscount(data.discount)
      } catch (error) {
        console.error('Failed to fetch discount:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDiscount()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!discount) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Discount not found</h2>
        <Link href="/dashboard/discounts" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to discounts
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/discounts"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Discount</h1>
          <p className="text-gray-500 mt-1">Update discount code: {discount.code}</p>
        </div>
      </div>

      <DiscountForm discount={discount} />
    </div>
  )
}
