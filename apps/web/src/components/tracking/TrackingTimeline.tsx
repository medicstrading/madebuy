'use client'

import {
  Package,
  Truck,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  Box,
  Building,
} from 'lucide-react'
import type { ShipmentStatus } from '@madebuy/shared'

interface TrackingEvent {
  timestamp: string
  status: ShipmentStatus
  description: string
  location?: string
}

interface TrackingTimelineProps {
  events: TrackingEvent[]
  currentStatus: ShipmentStatus
}

/**
 * Visual timeline of tracking events
 */
export function TrackingTimeline({ events, currentStatus }: TrackingTimelineProps) {
  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Get icon for status
  const getStatusIcon = (status: ShipmentStatus) => {
    switch (status) {
      case 'pending':
        return Clock
      case 'booked':
      case 'label_created':
        return Box
      case 'picked_up':
        return Building
      case 'in_transit':
        return MapPin
      case 'out_for_delivery':
        return Truck
      case 'delivered':
        return CheckCircle
      case 'failed':
        return AlertCircle
      case 'returned':
        return RotateCcw
      default:
        return Package
    }
  }

  // Get status color
  const getStatusColor = (status: ShipmentStatus, isFirst: boolean) => {
    if (!isFirst) {
      return 'bg-gray-100 text-gray-500 border-gray-200'
    }

    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-600 border-green-200'
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-600 border-blue-200'
      case 'in_transit':
      case 'picked_up':
        return 'bg-purple-100 text-purple-600 border-purple-200'
      case 'failed':
      case 'returned':
        return 'bg-red-100 text-red-600 border-red-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()

    const time = date.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    })

    if (isToday) {
      return { date: 'Today', time }
    }

    if (isYesterday) {
      return { date: 'Yesterday', time }
    }

    return {
      date: date.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      time,
    }
  }

  if (sortedEvents.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Tracking History</h3>
        <div className="flex items-center gap-3 text-gray-500">
          <Clock className="h-5 w-5" />
          <p>Tracking information will appear here once the package is shipped.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-6">Tracking History</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

        {/* Events */}
        <div className="space-y-6">
          {sortedEvents.map((event, index) => {
            const Icon = getStatusIcon(event.status)
            const isFirst = index === 0
            const { date, time } = formatTimestamp(event.timestamp)

            return (
              <div key={`${event.timestamp}-${index}`} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${getStatusColor(
                    event.status,
                    isFirst
                  )}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p
                      className={`font-medium ${
                        isFirst ? 'text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{date}</span>
                      <span className="text-gray-300">|</span>
                      <span>{time}</span>
                    </div>
                  </div>

                  {event.location && (
                    <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
