'use client'

import type { Milestone } from '@madebuy/shared'
import { createContext, useContext, useEffect, useState } from 'react'
import { CelebrationModal } from './CelebrationModal'

interface CelebrationContextValue {
  checkCelebrations: () => Promise<void>
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null)

export function useCelebrations() {
  const context = useContext(CelebrationContext)
  if (!context) {
    throw new Error('useCelebrations must be used within CelebrationProvider')
  }
  return context
}

interface CelebrationProviderProps {
  children: React.ReactNode
  checkOnMount?: boolean // Auto-check for celebrations when mounted
}

export function CelebrationProvider({
  children,
  checkOnMount = false,
}: CelebrationProviderProps) {
  const [currentCelebration, setCurrentCelebration] =
    useState<Milestone | null>(null)
  const [pendingCelebrations, setPendingCelebrations] = useState<Milestone[]>(
    [],
  )

  const checkCelebrations = async () => {
    try {
      const response = await fetch('/api/celebrations')
      if (!response.ok) return

      const { celebrations } = await response.json()

      if (celebrations && celebrations.length > 0) {
        setPendingCelebrations(celebrations)
        setCurrentCelebration(celebrations[0])
      }
    } catch (error) {
      console.error('Failed to check celebrations:', error)
    }
  }

  const handleDismiss = async () => {
    if (!currentCelebration) return

    try {
      // Mark as shown on the backend
      await fetch('/api/celebrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celebrationId: currentCelebration.id }),
      })

      // Show next celebration if there are more
      const remaining = pendingCelebrations.slice(1)
      setPendingCelebrations(remaining)

      if (remaining.length > 0) {
        // Wait a bit before showing the next one
        setTimeout(() => {
          setCurrentCelebration(remaining[0])
        }, 500)
      } else {
        setCurrentCelebration(null)
      }
    } catch (error) {
      console.error('Failed to mark celebration as shown:', error)
      setCurrentCelebration(null)
    }
  }

  // Check for celebrations on mount if requested
  useEffect(() => {
    if (checkOnMount) {
      checkCelebrations()
    }
  }, [checkOnMount])

  return (
    <CelebrationContext.Provider value={{ checkCelebrations }}>
      {children}
      {currentCelebration && (
        <CelebrationModal
          milestone={currentCelebration}
          onDismiss={handleDismiss}
        />
      )}
    </CelebrationContext.Provider>
  )
}
