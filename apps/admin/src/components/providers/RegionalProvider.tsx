'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { RegionalSettings } from '@madebuy/shared'
import { setRegionalContext } from '@/lib/utils'

interface RegionalContextValue {
  settings: RegionalSettings | null
}

const RegionalContext = createContext<RegionalContextValue>({ settings: null })

export function useRegionalSettings(): RegionalSettings | null {
  const context = useContext(RegionalContext)
  return context.settings
}

interface RegionalProviderProps {
  children: ReactNode
  settings: RegionalSettings | null
}

export function RegionalProvider({ children, settings }: RegionalProviderProps) {
  // Sync settings to the utils module for server-side and non-React code
  useEffect(() => {
    setRegionalContext(settings)
  }, [settings])

  return (
    <RegionalContext.Provider value={{ settings }}>
      {children}
    </RegionalContext.Provider>
  )
}
