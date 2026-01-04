'use client'

import { CheckCircle2, Circle } from 'lucide-react'

interface ContentProgressProps {
  complete: number
  total: number
}

export function ContentProgress({ complete, total }: ContentProgressProps) {
  const percent = total > 0 ? Math.round((complete / total) * 100) : 0
  const isComplete = complete === total && total > 0

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4 text-gray-300" />
          )}
          <span className={`text-sm font-medium ${isComplete ? 'text-emerald-600' : 'text-gray-700'}`}>
            {complete} of {total} sections
          </span>
        </div>
        <span className={`text-sm font-semibold ${isComplete ? 'text-emerald-600' : 'text-indigo-600'}`}>
          {percent}%
        </span>
      </div>

      {/* Completion message */}
      {isComplete && (
        <p className="text-sm text-emerald-600 font-medium animate-in slide-in-from-bottom-2 duration-300">
          All content is ready!
        </p>
      )}
    </div>
  )
}
