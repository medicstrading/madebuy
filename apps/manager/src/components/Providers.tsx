'use client'

import dynamic from 'next/dynamic'
import { type ReactNode } from 'react'

// Dynamically import SessionProvider with SSR disabled
// This prevents static generation errors with NextAuth
const SessionProviderWrapper = dynamic(
  () => import('next-auth/react').then((mod) => mod.SessionProvider),
  { ssr: false }
)

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProviderWrapper>{children}</SessionProviderWrapper>
}
