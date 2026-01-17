'use client'

import type { Material } from '@madebuy/shared'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface MaterialsListProps {
  materials: Material[]
  onDelete?: (id: string) => void
}

export function MaterialsList({ materials, onDelete }: MaterialsListProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'AUD',
    }).format(amount)
  }

  const getCategoryColor = (category: Material['category']) => {
    const colors: Record<Material['category'], string> = {
      stone: 'bg-purple-100 text-purple-800',
      metal: 'bg-gray-100 text-gray-800',
      wire: 'bg-blue-100 text-blue-800',
      chain: 'bg-indigo-100 text-indigo-800',
      finding: 'bg-yellow-100 text-yellow-800',
      bead: 'bg-pink-100 text-pink-800',
      tool: 'bg-red-100 text-red-800',
      packaging: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-600',
    }
    return colors[category] || colors.other
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No materials found</p>
        <p className="text-gray-400 text-sm mt-2">
          Add materials manually or scan an invoice to get started
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Material
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cost/Unit
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Supplier
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {materials.map((material) => (
            <tr key={material.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {material.name}
                </div>
                {material.tags && material.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {material.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(
                    material.category,
                  )}`}
                >
                  {material.category}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {material.quantityInStock} {material.unit}
                </div>
                {material.quantityInStock < 10 && (
                  <div className="text-xs text-red-600">Low stock</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatCurrency(material.costPerUnit, material.currency)}
                </div>
                <div className="text-xs text-gray-500">per {material.unit}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {material.supplier || '-'}
                </div>
                {material.supplierSku && (
                  <div className="text-xs text-gray-500">
                    SKU: {material.supplierSku}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/dashboard/materials/${material.id}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(material.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
