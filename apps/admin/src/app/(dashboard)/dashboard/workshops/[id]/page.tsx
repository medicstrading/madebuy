'use client'

import type { Workshop, WorkshopBooking, WorkshopSlot } from '@madebuy/shared'
import { ArrowLeft, Calendar, Plus, Save, Trash2, Users } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

export default function EditWorkshopPage() {
  const params = useParams()
  const router = useRouter()
  const workshopId = params?.id as string

  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [bookings, setBookings] = useState<WorkshopBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSlotForm, setShowSlotForm] = useState(false)

  const [slotForm, setSlotForm] = useState({
    startTime: '',
    endTime: '',
    capacity: '',
  })

  const fetchWorkshop = useCallback(async () => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}`)
      const data = await res.json()
      setWorkshop(data.workshop)
    } catch (error) {
      console.error('Failed to fetch workshop:', error)
    } finally {
      setLoading(false)
    }
  }, [workshopId])

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/bookings`)
      const data = await res.json()
      setBookings(data.data || [])
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    }
  }, [workshopId])

  useEffect(() => {
    fetchWorkshop()
    fetchBookings()
  }, [fetchWorkshop, fetchBookings])

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(`/api/workshops/${workshopId}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date(slotForm.startTime),
          endTime: new Date(slotForm.endTime),
          capacity: slotForm.capacity ? parseInt(slotForm.capacity) : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to create slot')
        return
      }

      setSlotForm({ startTime: '', endTime: '', capacity: '' })
      setShowSlotForm(false)
      fetchWorkshop()
    } catch (error) {
      console.error('Failed to create slot:', error)
      alert('Failed to create slot')
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this slot?')) return

    try {
      const res = await fetch(`/api/workshops/${workshopId}/slots/${slotId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete slot')
        return
      }

      fetchWorkshop()
    } catch (error) {
      console.error('Failed to delete slot:', error)
      alert('Failed to delete slot')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!workshop) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Workshop not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{workshop.name}</h1>
          <p className="text-gray-500 mt-1">{workshop.shortDescription}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workshop Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Price:</span>
                <div className="font-medium">{formatPrice(workshop.price)}</div>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <div className="font-medium">
                  {workshop.durationMinutes} minutes
                </div>
              </div>
              <div>
                <span className="text-gray-500">Capacity:</span>
                <div className="font-medium">{workshop.capacity} people</div>
              </div>
              <div>
                <span className="text-gray-500">Location:</span>
                <div className="font-medium capitalize">
                  {workshop.locationType}
                </div>
              </div>
            </div>
          </div>

          {/* Time Slots */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Time Slots
              </h2>
              <button
                onClick={() => setShowSlotForm(!showSlotForm)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Slot
              </button>
            </div>

            {showSlotForm && (
              <form
                onSubmit={handleAddSlot}
                className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={slotForm.startTime}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={slotForm.endTime}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, endTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSlotForm(false)}
                    className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {workshop.slots.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No time slots yet. Add one to start taking bookings.
                </p>
              ) : (
                workshop.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {formatDateTime(slot.startTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {slot.bookedCount} / {slot.capacity} booked
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          slot.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : slot.status === 'full'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {slot.status}
                      </span>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bookings Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Bookings
            </h2>
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No bookings yet
                </p>
              ) : (
                bookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {booking.customerName}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {booking.numberOfAttendees} attendee
                      {booking.numberOfAttendees > 1 ? 's' : ''}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {formatPrice(booking.total)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
