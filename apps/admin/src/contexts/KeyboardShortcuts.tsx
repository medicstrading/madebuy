'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

// Shortcuts configuration
export const SHORTCUTS = {
  navigation: {
    label: 'Navigation',
    shortcuts: [
      { keys: ['g', 'd'], label: 'Go to Dashboard', path: '/dashboard' },
      {
        keys: ['g', 'i'],
        label: 'Go to Inventory',
        path: '/dashboard/inventory',
      },
      { keys: ['g', 'o'], label: 'Go to Orders', path: '/dashboard/orders' },
      {
        keys: ['g', 'c'],
        label: 'Go to Customers',
        path: '/dashboard/customers',
      },
      {
        keys: ['g', 'm'],
        label: 'Go to Materials',
        path: '/dashboard/materials',
      },
      { keys: ['g', 'p'], label: 'Go to Publish', path: '/dashboard/publish' },
      {
        keys: ['g', 's'],
        label: 'Go to Settings',
        path: '/dashboard/settings',
      },
    ],
  },
  actions: {
    label: 'Actions',
    shortcuts: [
      { keys: ['n'], label: 'New item (context-aware)', action: 'new' },
      { keys: ['/'], label: 'Focus search', action: 'search' },
      { keys: ['?'], label: 'Show shortcuts help', action: 'help' },
    ],
  },
}

// Context-aware "new" paths
const NEW_ITEM_PATHS: Record<string, string> = {
  '/dashboard/inventory': '/dashboard/inventory/new',
  '/dashboard/materials': '/dashboard/materials/new',
  '/dashboard/collections': '/dashboard/collections/new',
  '/dashboard/blog': '/dashboard/blog/new',
  '/dashboard/publish': '/dashboard/publish/new',
  '/dashboard/newsletters': '/dashboard/newsletters/new',
  '/dashboard/bundles': '/dashboard/bundles/new',
}

// Stable context (rarely changes)
interface StableKeyboardContextType {
  showHelp: boolean
  setShowHelp: (show: boolean) => void
}

// Transient context (changes frequently during key sequences)
interface TransientKeyboardContextType {
  pendingKey: string | null
}

const StableKeyboardContext = createContext<StableKeyboardContextType | null>(null)
const TransientKeyboardContext = createContext<TransientKeyboardContextType | null>(null)

export function useKeyboardShortcuts() {
  const stable = useContext(StableKeyboardContext)
  if (!stable) {
    throw new Error(
      'useKeyboardShortcuts must be used within KeyboardShortcutsProvider',
    )
  }
  return stable
}

export function useKeyboardPendingKey() {
  const transient = useContext(TransientKeyboardContext)
  return transient?.pendingKey ?? null
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode
}

export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showHelp, setShowHelp] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  // Check if user is typing in an input field
  const isTypingInInput = useCallback(() => {
    const activeElement = document.activeElement
    if (!activeElement) return false

    const tagName = activeElement.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true
    }

    // Also check for contenteditable elements
    if (activeElement.getAttribute('contenteditable') === 'true') {
      return true
    }

    return false
  }, [])

  // Get context-aware "new" path
  const getNewItemPath = useCallback(() => {
    // Find exact match first
    if (pathname && NEW_ITEM_PATHS[pathname]) {
      return NEW_ITEM_PATHS[pathname]
    }

    // Find partial match for nested routes
    for (const [basePath, newPath] of Object.entries(NEW_ITEM_PATHS)) {
      if (pathname?.startsWith(basePath)) {
        return newPath
      }
    }

    // Default to inventory new
    return '/dashboard/inventory/new'
  }, [pathname])

  // Focus search input
  const focusSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[type="text"][placeholder*="Search"], input[type="search"]',
    )
    if (searchInput) {
      searchInput.focus()
      return true
    }
    return false
  }, [])

  // Handle keyboard events
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input
      if (isTypingInInput()) {
        // Exception: allow Escape to blur input
        if (event.key === 'Escape') {
          ;(document.activeElement as HTMLElement)?.blur()
        }
        return
      }

      // Skip if modifier keys are pressed (except Shift for ?)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const key = event.key.toLowerCase()

      // Handle ? for help (Shift+/)
      if (event.key === '?') {
        event.preventDefault()
        setShowHelp((prev) => !prev)
        return
      }

      // Handle Escape to close help
      if (event.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false)
          event.preventDefault()
        }
        return
      }

      // Handle / for search
      if (key === '/') {
        event.preventDefault()
        focusSearch()
        return
      }

      // Handle n for new item
      if (key === 'n' && !pendingKey) {
        event.preventDefault()
        const newPath = getNewItemPath()
        router.push(newPath)
        return
      }

      // Handle g prefix for navigation
      if (key === 'g' && !pendingKey) {
        event.preventDefault()
        setPendingKey('g')
        // Clear pending key after timeout
        timeoutId = setTimeout(() => {
          setPendingKey(null)
        }, 1000)
        return
      }

      // Handle second key in g sequence
      if (pendingKey === 'g') {
        event.preventDefault()
        setPendingKey(null)

        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }

        // Find matching navigation shortcut
        const navShortcut = SHORTCUTS.navigation.shortcuts.find(
          (s) => s.keys[1] === key,
        )

        if (navShortcut?.path) {
          router.push(navShortcut.path)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [
    isTypingInInput,
    pendingKey,
    showHelp,
    router,
    getNewItemPath,
    focusSearch,
  ])

  const stableValue = useMemo(
    () => ({ showHelp, setShowHelp }),
    [showHelp]
  )

  const transientValue = useMemo(
    () => ({ pendingKey }),
    [pendingKey]
  )

  return (
    <StableKeyboardContext.Provider value={stableValue}>
      <TransientKeyboardContext.Provider value={transientValue}>
        {children}
      </TransientKeyboardContext.Provider>
    </StableKeyboardContext.Provider>
  )
}
