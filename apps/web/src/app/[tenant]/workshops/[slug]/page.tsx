'use client'

import type { Workshop, WorkshopSlot } from '@madebuy/shared'
import {
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function WorkshopDetailPage() {
  const params = useParams()
  const tenantSlug = params?.tenant as string
  const workshopSlug = params?.slug as string

  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [availableSlots, setAvailableSlots] = useState<WorkshopSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkshopData()
  }, [workshopSlug])

  async function fetchWorkshopData() {
    try {
      // Fetch workshop by slug
      const workshopsRes = await fetch(`/api/tenants/${tenantSlug}/workshops`)
      const workshopsData = await workshopsRes.json()
      const foundWorkshop = workshopsData.data?.find(
        (w: Workshop) => w.slug === workshopSlug,
      )

      if (!foundWorkshop) {
        setLoading(false)
        return
      }

      setWorkshop(foundWorkshop)

      // Get available slots
      const slots = foundWorkshop.slots.filter(
        (slot: WorkshopSlot) =>
          slot.status === 'available' &&
          slot.bookedCount < slot.capacity &&
          new Date(slot.startTime) > new Date(),
      )

      // Sort by date
      slots.sort(
        (a: WorkshopSlot, b: WorkshopSlot) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )

      setAvailableSlots(slots)
    } catch (error) {
      console.error('Failed to fetch workshop:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleBooking() {
    if (!selectedSlot) {
      alert('Please select a time slot')
      return
    }

    // TODO: Implement booking flow with Stripe checkout
    alert('Booking flow to be implemented with Stripe checkout')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Workshop Not Found
          </h1>
          <Link
            href={`/${tenantSlug}/workshops`}
            className="text-blue-600 hover:underline"
          >
            Browse all workshops
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/${tenantSlug}`} className="hover:text-gray-900">
              Shop
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/${tenantSlug}/workshops`}
              className="hover:text-gray-900"
            >
              Workshops
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">{workshop.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {workshop.name}
              </h1>
              <p className="text-gray-600 text-lg mb-6">
                {workshop.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Duration</div>
                    <div className="font-medium text-gray-900">
                      {workshop.durationMinutes} min
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Capacity</div>
                    <div className="font-medium text-gray-900">
                      {workshop.capacity}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  {workshop.locationType === 'virtual' ? (
                    <Video className="w-5 h-5 text-gray-400" />
                  ) : (
                    <MapPin className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="font-medium text-gray-900 capitalize">
                      {workshop.locationType}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <div>
                    <div className="text-xs text-gray-500">Price</div>
                    <div className="font-bold text-blue-600 text-lg">
                      {formatPrice(workshop.price)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            {(workshop.requirements || workshop.skillLevel) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                {workshop.skillLevel && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Skill Level
                    </h3>
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                      {workshop.skillLevel.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {workshop.requirements && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      What to Bring
                    </h3>
                    <p className="text-gray-600">{workshop.requirements}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select a Time Slot
              </h2>

              {availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No available slots at the moment.
                    <br />
                    Check back soon!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedSlot === slot.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {formatDateTime(slot.startTime)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {slot.capacity - slot.bookedCount} spot
                        {slot.capacity - slot.bookedCount !== 1 ? 's' : ''} left
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {availableSlots.length > 0 && (
                <button
                  onClick={handleBooking}
                  disabled={!selectedSlot}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Book Now - {formatPrice(workshop.price)}
                </button>
              )}

              {workshop.cancellationPolicy && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Cancellation Policy
                  </h3>
                  <p className="text-xs text-gray-600">
                    {workshop.cancellationPolicy}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
