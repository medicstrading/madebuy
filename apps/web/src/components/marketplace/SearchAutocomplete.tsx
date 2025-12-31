'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Clock, TrendingUp, X, Loader2, ArrowRight } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'product' | 'category' | 'seller'
  name: string
  slug?: string
  image?: string
  price?: number
  currency?: string
  subtitle?: string
}

interface SearchAutocompleteProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
}

const RECENT_SEARCHES_KEY = 'madebuy_recent_searches'
const MAX_RECENT = 5

const POPULAR_SEARCHES = [
  'handmade jewelry',
  'personalized gifts',
  'vintage decor',
  'custom art',
  'organic skincare',
  'wedding accessories',
]

export function SearchAutocomplete({
  placeholder = 'Search for handmade items...',
  className = '',
  onSearch,
}: SearchAutocompleteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load recent searches
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch {
        setRecentSearches([])
      }
    }
  }, [])

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s.toLowerCase() !== searchQuery.toLowerCase()),
    ].slice(0, MAX_RECENT)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  // Remove recent search
  const removeRecentSearch = (searchQuery: string) => {
    const updated = recentSearches.filter((s) => s !== searchQuery)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  // Clear all recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  // Search API call (mock - replace with actual API)
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/marketplace/search?q=${encodeURIComponent(searchQuery)}`)
      // const data = await response.json()
      // setResults(data.results)

      // Mock results for demo
      await new Promise((resolve) => setTimeout(resolve, 300))

      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'product',
          name: `${searchQuery} Handmade Necklace`,
          slug: 'handmade-necklace',
          image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=100',
          price: 89.99,
          currency: 'AUD',
        },
        {
          id: '2',
          type: 'product',
          name: `Custom ${searchQuery} Ring`,
          slug: 'custom-ring',
          image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=100',
          price: 145.0,
          currency: 'AUD',
        },
        {
          id: '3',
          type: 'category',
          name: `${searchQuery}`,
          slug: searchQuery.toLowerCase().replace(/\s+/g, '-'),
          subtitle: '250+ items',
        },
        {
          id: '4',
          type: 'seller',
          name: `${searchQuery} Artisan Studio`,
          slug: 'artisan-studio',
          image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
          subtitle: 'Melbourne, AU',
        },
      ]

      setResults(mockResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        fetchResults(query)
      }, 200)
    } else {
      setResults([])
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, fetchResults])

  // Handle search submit
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    saveRecentSearch(searchQuery)
    setIsOpen(false)
    setQuery('')

    if (onSearch) {
      onSearch(searchQuery)
    } else {
      router.push(`/marketplace/browse?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = results.length + recentSearches.length + POPULAR_SEARCHES.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          const result = results[selectedIndex]
          if (result.type === 'product') {
            router.push(`/marketplace/product/${result.slug || result.id}`)
          } else if (result.type === 'category') {
            router.push(`/marketplace/categories/${result.slug}`)
          } else {
            router.push(`/sellers/${result.slug}`)
          }
          setIsOpen(false)
        } else {
          handleSearch(query)
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showDropdown = isOpen && (query.trim() || recentSearches.length > 0 || isFocused)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div
        className={`
          relative flex items-center rounded-full border-2 bg-white
          transition-all duration-200
          ${
            isFocused
              ? 'border-mb-blue shadow-lg shadow-mb-blue/10'
              : 'border-mb-sand hover:border-mb-sky-dark'
          }
        `}
      >
        <Search
          className={`ml-4 h-5 w-5 transition-colors ${
            isFocused ? 'text-mb-blue' : 'text-mb-slate-light'
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            setIsOpen(true)
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            flex-1 bg-transparent px-3 py-3 text-sm text-mb-slate
            placeholder-mb-slate-light focus:outline-none
          "
          aria-label="Search"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="mr-2 rounded-full p-1.5 text-mb-slate-light hover:bg-mb-cream hover:text-mb-slate"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="mr-4 h-4 w-4 animate-spin text-mb-blue" />
        )}
        {!isLoading && !query && (
          <button
            onClick={() => handleSearch(query)}
            className="mr-2 rounded-full bg-mb-blue px-4 py-2 text-sm font-medium text-white hover:bg-mb-blue-dark transition-colors"
          >
            Search
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="
            absolute left-0 right-0 top-full z-50 mt-2
            rounded-xl border border-mb-sand bg-white shadow-xl
            animate-in fade-in slide-in-from-top-2 duration-200
            max-h-[70vh] overflow-y-auto
          "
        >
          {/* Search Results */}
          {results.length > 0 && (
            <div className="border-b border-mb-sand p-2">
              {results.map((result, index) => (
                <Link
                  key={result.id}
                  href={
                    result.type === 'product'
                      ? `/marketplace/product/${result.slug || result.id}`
                      : result.type === 'category'
                        ? `/marketplace/categories/${result.slug}`
                        : `/sellers/${result.slug}`
                  }
                  onClick={() => {
                    setIsOpen(false)
                    saveRecentSearch(query)
                  }}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2
                    transition-colors
                    ${
                      selectedIndex === index
                        ? 'bg-mb-sky'
                        : 'hover:bg-mb-cream'
                    }
                  `}
                >
                  {/* Image/Icon */}
                  {result.image ? (
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-mb-sand">
                      <Image
                        src={result.image}
                        alt={result.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-mb-sky">
                      {result.type === 'category' ? (
                        <ArrowRight className="h-4 w-4 text-mb-blue" />
                      ) : (
                        <Search className="h-4 w-4 text-mb-slate-light" />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-mb-slate truncate">
                      {result.name}
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-mb-slate-light">{result.subtitle}</p>
                    )}
                  </div>

                  {/* Price for products */}
                  {result.price !== undefined && (
                    <span className="text-sm font-semibold text-mb-slate">
                      ${result.price.toFixed(2)}
                    </span>
                  )}

                  {/* Type badge */}
                  <span
                    className={`
                      rounded-full px-2 py-0.5 text-[10px] font-medium uppercase
                      ${
                        result.type === 'product'
                          ? 'bg-mb-sky text-mb-blue'
                          : result.type === 'category'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-blue-50 text-blue-600'
                      }
                    `}
                  >
                    {result.type}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && !query.trim() && (
            <div className="border-b border-mb-sand p-2">
              <div className="mb-2 flex items-center justify-between px-3">
                <div className="flex items-center gap-2 text-xs font-medium text-mb-slate-light">
                  <Clock className="h-3.5 w-3.5" />
                  Recent Searches
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-mb-slate-light hover:text-mb-blue"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <div
                  key={search}
                  className={`
                    group flex items-center justify-between rounded-lg px-3 py-2
                    ${
                      selectedIndex === results.length + index
                        ? 'bg-mb-sky'
                        : 'hover:bg-mb-cream'
                    }
                  `}
                >
                  <button
                    onClick={() => handleSearch(search)}
                    className="flex flex-1 items-center gap-2 text-sm text-mb-slate"
                  >
                    <Clock className="h-4 w-4 text-mb-slate-light" />
                    {search}
                  </button>
                  <button
                    onClick={() => removeRecentSearch(search)}
                    className="p-1 text-mb-slate-light opacity-0 group-hover:opacity-100 hover:text-mb-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {!query.trim() && (
            <div className="p-2">
              <div className="mb-2 flex items-center gap-2 px-3 text-xs font-medium text-mb-slate-light">
                <TrendingUp className="h-3.5 w-3.5" />
                Popular Searches
              </div>
              <div className="flex flex-wrap gap-2 px-2">
                {POPULAR_SEARCHES.map((search, index) => (
                  <button
                    key={search}
                    onClick={() => handleSearch(search)}
                    className={`
                      rounded-full border border-mb-sand px-3 py-1.5
                      text-xs font-medium text-mb-slate
                      transition-all hover:border-mb-blue hover:bg-mb-sky hover:text-mb-blue
                      ${
                        selectedIndex === results.length + recentSearches.length + index
                          ? 'border-mb-blue bg-mb-sky text-mb-blue'
                          : ''
                      }
                    `}
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {query.trim() && results.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-mb-slate-light">
                No results found for "<span className="font-medium text-mb-slate">{query}</span>"
              </p>
              <button
                onClick={() => handleSearch(query)}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mb-blue hover:text-mb-blue-dark"
              >
                Search all products
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
