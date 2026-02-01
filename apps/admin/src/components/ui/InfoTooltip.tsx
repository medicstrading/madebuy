'use client'

import { ExternalLink, Info } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface InfoTooltipProps {
  content: string
  className?: string
  helpLink?: string
  helpLinkText?: string
}

export function InfoTooltip({
  content,
  className = '',
  helpLink,
  helpLinkText = 'Learn more',
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="rounded-full p-0.5 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
        aria-label="More information"
      >
        <Info className="h-4 w-4" />
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-lg">
          <div className="relative">
            {content}
            {helpLink && (
              <Link
                href={helpLink}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {helpLinkText}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {/* Arrow */}
            <div className="absolute -bottom-[14px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white" />
          </div>
        </div>
      )}
    </div>
  )
}
