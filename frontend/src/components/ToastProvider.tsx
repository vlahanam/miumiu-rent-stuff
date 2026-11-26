'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const success = useCallback((msg: string) => show(msg, 'success'), [show])
  const error = useCallback((msg: string) => show(msg, 'error'), [show])
  const info = useCallback((msg: string) => show(msg, 'info'), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-16 inset-x-4 lg:top-20 lg:left-auto lg:right-6 z-[100] flex flex-col items-center lg:items-end gap-2 pointer-events-none">
          {toasts.map((t) => {
            const bg =
              t.variant === 'error'
                ? 'bg-error text-on-error'
                : t.variant === 'success'
                ? 'bg-tertiary-container text-on-tertiary'
                : 'bg-primary-container text-on-primary'
            const icon =
              t.variant === 'error' ? 'error' : t.variant === 'success' ? 'check_circle' : 'info'
            return (
              <div
                key={t.id}
                className={`max-w-md w-fit px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-auto ${bg}`}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">{icon}</span>
                <span className="font-label-md text-label-md leading-snug">{t.message}</span>
              </div>
            )
          })}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
