import { requireTenant } from '@/lib/session'
import { pieces } from '@madebuy/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import { PersonalizationConfigEditor } from '@/components/inventory/PersonalizationConfigEditor'
import { formatCurrency } from '@/lib/utils'

interface PieceDetailPageProps {
  params: { id: string }
}

export default async function PieceDetailPage({ params }: PieceDetailPageProps) {
  const tenant = await requireTenant()
  const piece = await pieces.getPiece(tenant.id, params.id)

  if (!piece) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{piece.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {piece.category} · {formatCurrency(piece.price, piece.currency)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={piece.status} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info Card */}
        <div className="rounded-lg bg-white shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-400" />
            Product Details
          </h2>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-gray-900">{piece.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-gray-900">{piece.category}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Price</dt>
              <dd className="mt-1 text-gray-900">{formatCurrency(piece.price, piece.currency)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Stock</dt>
              <dd className="mt-1 text-gray-900">{piece.stock ?? 'Unlimited'}</dd>
            </div>
            {piece.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{piece.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Personalization Config */}
        <div className="rounded-lg bg-white shadow p-6">
          <PersonalizationConfigEditor
            pieceId={piece.id}
            pieceName={piece.name}
            initialConfig={piece.personalization}
          />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    available: 'bg-green-100 text-green-800',
    sold: 'bg-blue-100 text-blue-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-600',
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${colors[status as keyof typeof colors] || colors.draft}`}>
      {status}
    </span>
  )
}
