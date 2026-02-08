'use client'

import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SearchInputProps {
  onSearch: (query: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  debounceMs?: number
}

export function SearchInput({
  onSearch,
  placeholder = 'Search products...',
  autoFocus = false,
  className = '',
  debounceMs = 300,
}: SearchInputProps) {
  const [value, setValue] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout>()
  const onSearchRef = useRef(onSearch)

  // Keep ref in sync with latest onSearch
  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  // Debounced search handler
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      onSearchRef.current(value)
    }, debounceMs)

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, debounceMs])

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
  }, [onSearch])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
