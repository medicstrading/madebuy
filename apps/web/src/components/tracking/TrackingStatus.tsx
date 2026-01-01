'use client'

import {
  Package,
  Truck,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react'
import type { ShipmentStatus } from '@madebuy/shared'

interface TrackingStatusProps {
  status: ShipmentStatus
  estimatedDelivery?: string
  estimatedDeliveryRange?: [string, string]
}

/**
 * Status display component with progress bar
 */
export function TrackingStatus({
  status,
  estimatedDelivery,
  estimatedDeliveryRange,
}: TrackingStatusProps) {
  // Define the main progress steps
  const steps = [
    { key: 'ordered', label: 'Ordered', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'in_transit', label: 'In Transit', icon: MapPin },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ]

  // Map status to step index
  const getStepIndex = (s: ShipmentStatus): number => {
    switch (s) {
      case 'pending':
        return 0
      case 'booked':
      case 'label_created':
        return 0.5 // Between ordered and shipped
      case 'picked_up':
        return 1
      case 'in_transit':
        return 2
      case 'out_for_delivery':
        return 2.5 // Between in transit and delivered
      case 'delivered':
        return 3
      case 'failed':
      case 'returned':
        return -1 // Special case
      default:
        return 0
    }
  }

  const currentStepIndex = getStepIndex(status)
  const isError = status === 'failed' || status === 'returned'

  // Status messages
  const statusMessages: Record<ShipmentStatus, string> = {
    pending: 'Your order is being prepared',
    booked: 'Shipping label created, awaiting pickup',
    label_created: 'Shipping label created, awaiting pickup',
    picked_up: 'Package picked up by carrier',
    in_transit: 'On the way to you',
    out_for_delivery: 'Out for delivery today!',
    delivered: 'Delivered!',
    failed: 'Delivery unsuccessful - see details below',
    returned: 'Package returned to sender',
  }

  // Status colors
  const getStatusColor = (s: ShipmentStatus) => {
    if (s === 'delivered') return 'text-green-600 bg-green-100'
    if (s === 'out_for_delivery') return 'text-blue-600 bg-blue-100'
    if (s === 'failed' || s === 'returned') return 'text-red-600 bg-red-100'
    return 'text-purple-600 bg-purple-100'
  }

  // Status icon
  const StatusIcon = isError
    ? status === 'returned' ? RotateCcw : AlertCircle
    : status === 'delivered'
    ? CheckCircle
    : status === 'out_for_delivery'
    ? Truck
    : status === 'in_transit'
    ? MapPin
    : Package

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      {/* Main Status Display */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${getStatusColor(status)}`}>
          <StatusIcon className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">
            {statusMessages[status]}
          </h2>
          {estimatedDelivery && !isError && status !== 'delivered' && (
            <p className="mt-1 text-gray-600">
              Estimated delivery: <span className="font-medium">{formatDate(estimatedDelivery)}</span>
            </p>
          )}
          {estimatedDeliveryRange && !estimatedDelivery && !isError && status !== 'delivered' && (
            <p className="mt-1 text-gray-600">
              Expected: <span className="font-medium">
                {formatDate(estimatedDeliveryRange[0])} - {formatDate(estimatedDeliveryRange[1])}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isError && (
        <div className="relative">
          {/* Progress line background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />

          {/* Progress line filled */}
          <div
            className="absolute top-5 left-0 h-1 bg-purple-600 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (currentStepIndex / (steps.length - 1)) * 100)}%`,
            }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const isCompleted = currentStepIndex >= index
              const isCurrent = Math.floor(currentStepIndex) === index
              const StepIcon = step.icon

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-purple-200' : ''}`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCompleted ? 'text-purple-600' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">
                {status === 'returned'
                  ? 'Package Returned'
                  : 'Delivery Issue'}
              </p>
              <p className="text-sm text-red-600 mt-1">
                {status === 'returned'
                  ? 'The package has been returned to the sender. Please contact the seller for assistance.'
                  : 'There was an issue with the delivery. Please check the tracking details below or contact the seller.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Out for Delivery Banner */}
      {status === 'out_for_delivery' && (
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-blue-600" />
            <p className="font-medium text-blue-800">
              Your package is out for delivery today!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
