'use client'

import { useKeyboardShortcuts, useKeyboardPendingKey } from '@/contexts/KeyboardShortcuts'

export function ShortcutsHint() {
  const { setShowHelp } = useKeyboardShortcuts()
  const pendingKey = useKeyboardPendingKey()

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-t border-gray-200">
      <div className="flex items-center gap-2">
        {pendingKey && (
          <span className="text-xs text-blue-600 font-medium animate-pulse">
            Waiting for second key...
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
      >
        Press{' '}
        <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-600 font-mono shadow-sm">
          ?
        </kbd>{' '}
        for shortcuts
      </button>
    </div>
  )
}
