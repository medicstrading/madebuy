'use client'

import { useEffect, useRef } from 'react'
import { X, Keyboard } from 'lucide-react'
import { SHORTCUTS, useKeyboardShortcuts } from '@/contexts/KeyboardShortcuts'

export function ShortcutsHelp() {
  const { showHelp, setShowHelp } = useKeyboardShortcuts()
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowHelp(false)
      }
    }

    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHelp, setShowHelp])

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Keyboard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-xs text-gray-500">Navigate faster with keyboard</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Navigation shortcuts */}
          <ShortcutGroup
            label={SHORTCUTS.navigation.label}
            shortcuts={SHORTCUTS.navigation.shortcuts}
          />

          {/* Action shortcuts */}
          <ShortcutGroup
            label={SHORTCUTS.actions.label}
            shortcuts={SHORTCUTS.actions.shortcuts}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700 font-mono text-xs">Esc</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700 font-mono text-xs">?</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}

interface ShortcutGroupProps {
  label: string
  shortcuts: Array<{
    keys: string[]
    label: string
    path?: string
    action?: string
  }>
}

function ShortcutGroup({ label, shortcuts }: ShortcutGroupProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {label}
      </h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.label}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
          >
            <span className="text-sm text-gray-700">{shortcut.label}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, index) => (
                <span key={index} className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700 shadow-sm min-w-[24px] text-center">
                    {formatKey(key)}
                  </kbd>
                  {index < shortcut.keys.length - 1 && (
                    <span className="text-xs text-gray-400">then</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatKey(key: string): string {
  // Format special keys for display
  const keyMap: Record<string, string> = {
    '/': '/',
    '?': '?',
  }
  return keyMap[key] || key.toUpperCase()
}
