'use client'

import { useEffect } from 'react'

/**
 * Ngăn trình duyệt (đặc biệt iOS Safari/WKWebView) scale/pinch-zoom giao diện.
 * Hoạt động song song với cấu hình viewport, touch-action và font-size >= 16px cho input.
 */
export function ZoomGuard() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault()
    }

    document.addEventListener('gesturestart', preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })
    document.addEventListener('gestureend', preventGesture, { passive: false })

    return () => {
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
      document.removeEventListener('gestureend', preventGesture)
    }
  }, [])

  return null
}
