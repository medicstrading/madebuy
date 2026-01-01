'use client'

import { Shipment } from '@madebuy/shared'
import { formatDate } from '@/lib/utils'
import { Package, Truck, CheckCircle, Clock, AlertCircle, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface ShipmentCardProps {
  shipment: Shipment
}

export function ShipmentCard({ shipment }: ShipmentCardProps) {
  const [copied, setCopied] = useState(false)

  const copyTrackingNumber = async () => {
    if (shipment.trackingNumber) {
      await navigator.clipboard.writeText(shipment.trackingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
    pending: {
      icon: Clock,
      color: 'bg-gray-100 text-gray-600',
      label: 'Pending',
    },
    booked: {
      icon: Package,
      color: 'bg-blue-100 text-blue-600',
      label: 'Booked',
    },
    label_created: {
      icon: Package,
      color: 'bg-blue-100 text-blue-600',
      label: 'Label Created',
    },
    picked_up: {
      icon: Truck,
      color: 'bg-indigo-100 text-indigo-600',
      label: 'Picked Up',
    },
    in_transit: {
      icon: Truck,
      color: 'bg-purple-100 text-purple-600',
      label: 'In Transit',
    },
    out_for_delivery: {
      icon: Truck,
      color: 'bg-amber-100 text-amber-600',
      label: 'Out for Delivery',
    },
    delivered: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
      label: 'Delivered',
    },
    failed: {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600',
      label: 'Failed',
    },
    cancelled: {
      icon: AlertCircle,
      color: 'bg-gray-100 text-gray-600',
      label: 'Cancelled',
    },
  }

  const config = statusConfig[shipment.status] || statusConfig.pending
  const StatusIcon = config.icon

  const carrierLogos: Record<string, string> = {
    sendle: '/carriers/sendle.svg',
    auspost: '/carriers/auspost.svg',
  }

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}>
            <StatusIcon className="h-5 w-5" />
          </div>

          {/* Shipment Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                Order {shipment.orderId.slice(0, 8)}...
              </span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
            </div>

            {shipment.trackingNumber && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-mono text-gray-600">{shipment.trackingNumber}</span>
                <button
                  onClick={copyTrackingNumber}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy tracking number"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}

            <p className="mt-1 text-xs text-gray-500">
              Created {formatDate(shipment.createdAt)}
              {shipment.shippedAt && ` | Shipped ${formatDate(shipment.shippedAt)}`}
              {shipment.deliveredAt && ` | Delivered ${formatDate(shipment.deliveredAt)}`}
            </p>
          </div>
        </div>

        {/* Right Side - Carrier & Actions */}
        <div className="flex items-center gap-4">
          {/* Carrier */}
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 capitalize">
              {shipment.carrier === 'sendle' ? 'Sendle' : shipment.carrier}
            </p>
            {shipment.weight && (
              <p className="text-xs text-gray-500">{shipment.weight}kg</p>
            )}
          </div>

          {/* Track Link */}
          {shipment.trackingUrl && (
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Track
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
