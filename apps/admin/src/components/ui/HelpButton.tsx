'use client'

import { HelpCircle } from 'lucide-react'
import Link from 'next/link'

interface HelpButtonProps {
  href?: string
  tooltip?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'inline'
}

export function HelpButton({
  href = '/dashboard/help',
  tooltip = 'Get help',
  size = 'md',
  variant = 'default',
}: HelpButtonProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
    lg: 'h-10 w-10 p-2',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        title={tooltip}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
      >
        <HelpCircle className={iconSizes[size]} />
        <span>Help</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      title={tooltip}
      className={`inline-flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors ${sizeClasses[size]}`}
    >
      <HelpCircle className={iconSizes[size]} />
    </Link>
  )
}
