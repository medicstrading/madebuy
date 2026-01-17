'use client'

import { useCallback, useState } from 'react'
import type { ToastType } from '@/components/ui/Toast'

interface Toast {
  id: string
  message: string
  type: ToastType
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback(
    (message: string) => addToast(message, 'success'),
    [addToast],
  )
  const error = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast],
  )
  const warning = useCallback(
    (message: string) => addToast(message, 'warning'),
    [addToast],
  )
  const info = useCallback(
    (message: string) => addToast(message, 'info'),
    [addToast],
  )

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}
