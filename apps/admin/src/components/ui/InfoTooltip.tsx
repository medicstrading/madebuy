'use client'

import { Info } from 'lucide-react'
import { useState } from 'react'

interface InfoTooltipProps {
  content: string
  className?: string
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
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
            {/* Arrow */}
            <div className="absolute -bottom-[14px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white" />
          </div>
        </div>
      )}
    </div>
  )
}
