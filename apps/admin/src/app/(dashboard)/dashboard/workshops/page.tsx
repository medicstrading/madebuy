'use client'

import type { Workshop } from '@madebuy/shared'
import {
  Archive,
  Calendar,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Trash2,
  Users,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function formatPrice(cents: number | undefined): string {
  if (cents === undefined) return '-'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function StatusBadge({ status }: { status: Workshop['status'] }) {
  const styles = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    archived: 'bg-amber-100 text-amber-800',
  }

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function LocationBadge({ type }: { type: Workshop['locationType'] }) {
  const Icon = type === 'virtual' ? Video : MapPin
  const label =
    type === 'physical' ? 'Physical' : type === 'virtual' ? 'Virtual' : 'Hybrid'

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkshops = useCallback(async () => {
    try {
      const res = await fetch('/api/workshops')
      const data = await res.json()
      setWorkshops(data.data || [])
    } catch (error) {
      console.error('Failed to fetch workshops:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkshops()
  }, [fetchWorkshops])

  async function updateStatus(id: string, status: Workshop['status']) {
    try {
      await fetch(`/api/workshops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchWorkshops()
    } catch (error) {
      console.error('Failed to update workshop status:', error)
    }
  }

  async function togglePublished(id: string, currentStatus: boolean) {
    try {
      await fetch(`/api/workshops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublishedToWebsite: !currentStatus }),
      })
      fetchWorkshops()
    } catch (error) {
      console.error('Failed to toggle publish status:', error)
    }
  }

  async function deleteWorkshop(id: string) {
    if (!confirm('Are you sure you want to delete this workshop?')) return

    try {
      const res = await fetch(`/api/workshops/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete workshop')
        return
      }
      fetchWorkshops()
    } catch (error) {
      console.error('Failed to delete workshop:', error)
      alert('Failed to delete workshop')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Workshops & Classes
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your workshops, classes, and service bookings
          </p>
        </div>
        <Link
          href="/dashboard/workshops/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Workshop
        </Link>
      </div>

      {/* Workshops List */}
      {workshops.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No workshops yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first workshop to start taking bookings
          </p>
          <Link
            href="/dashboard/workshops/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Workshop
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workshop
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workshops.map((workshop) => (
                  <tr key={workshop.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/workshops/${workshop.id}`}
                        className="hover:text-blue-600"
                      >
                        <div className="font-medium text-gray-900">
                          {workshop.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {workshop.durationMinutes} minutes
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <LocationBadge type={workshop.locationType} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPrice(workshop.price)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Users className="w-4 h-4 text-gray-400" />
                        {workshop.capacity}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={workshop.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          togglePublished(
                            workshop.id,
                            workshop.isPublishedToWebsite,
                          )
                        }
                        className={`p-1 rounded hover:bg-gray-100 ${
                          workshop.isPublishedToWebsite
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}
                        title={
                          workshop.isPublishedToWebsite
                            ? 'Published to website'
                            : 'Not published'
                        }
                      >
                        {workshop.isPublishedToWebsite ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/workshops/${workshop.id}`}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Calendar className="w-4 h-4" />
                        </Link>
                        {workshop.status !== 'archived' && (
                          <button
                            onClick={() =>
                              updateStatus(workshop.id, 'archived')
                            }
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteWorkshop(workshop.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
