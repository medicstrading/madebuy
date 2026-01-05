'use client'

import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { DomainStatus } from '@madebuy/shared'

interface DomainStatusBadgeProps {
  status: DomainStatus
  className?: string
}

const STATUS_CONFIG = {
  none: {
    label: 'Not configured',
    icon: AlertCircle,
    styles: 'bg-gray-100 text-gray-700 border-gray-200',
    iconColor: 'text-gray-500',
  },
  pending_nameservers: {
    label: 'Pending verification',
    icon: Clock,
    styles: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
  },
  active: {
    label: 'Active',
    icon: CheckCircle2,
    styles: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
  },
}

export function DomainStatusBadge({ status, className = '' }: DomainStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.none
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${config.styles} ${className}`}
    >
      <Icon className={`h-4 w-4 ${config.iconColor}`} />
      {config.label}
    </span>
  )
}
