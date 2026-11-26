'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  authApi,
  clearStoredAuth,
  dashboardApi,
  getStoredToken,
  getStoredUser,
  getWsUrl,
  setStoredAuth,
  setStoredUser,
  setUnauthorizedHandler,
} from '@/lib/api'
import type { NguoiDung, WSEvent } from '@/types'

type WSCallback = (event: WSEvent) => void

interface AuthContextValue {
  user: NguoiDung | null
  token: string | null
  loading: boolean
  activeOrderBadge: number
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  refreshBadge: () => Promise<void>
  subscribeWS: (cb: WSCallback) => () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<NguoiDung | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeOrderBadge, setActiveOrderBadge] = useState(0)

  const wsListenersRef = useRef<Set<WSCallback>>(new Set())

  const subscribeWS = useCallback((cb: WSCallback) => {
    wsListenersRef.current.add(cb)
    return () => {
      wsListenersRef.current.delete(cb)
    }
  }, [])

  const refreshBadge = useCallback(async () => {
    if (!getStoredToken()) return
    try {
      const dash = await dashboardApi.get()
      const overdue = dash.thong_ke_phieu?.qua_han ?? dash.phieu_qua_han.length
      const dueToday = dash.phieu_can_tra_hom_nay.length
      setActiveOrderBadge(overdue + dueToday)
    } catch {
      // Bỏ qua lỗi nền
    }
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setToken(null)
    setUser(null)
    setActiveOrderBadge(0)
    router.replace('/login')
  }, [router])

  // Đăng ký callback khi gặp 401 từ API client
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null)
      setUser(null)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        router.replace('/login')
      }
    })
    return () => setUnauthorizedHandler(null)
  }, [router])

  // Khởi tạo phiên đăng nhập từ localStorage và xác thực với /auth/me
  useEffect(() => {
    let active = true
    const init = async () => {
      const storedToken = getStoredToken()
      const storedUser = getStoredUser()
      if (!storedToken) {
        if (active) {
          setToken(null)
          setUser(null)
          setLoading(false)
        }
        return
      }

      if (active) {
        setToken(storedToken)
        if (storedUser) setUser(storedUser)
      }

      try {
        const me = await authApi.getMe()
        if (active) {
          setUser(me)
          setStoredUser(me)
        }
      } catch {
        clearStoredAuth()
        if (active) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    init()
    return () => {
      active = false
    }
  }, [])

  // Bảo vệ route
  useEffect(() => {
    if (loading) return
    if (!token && pathname !== '/login') {
      router.replace('/login')
    } else if (token && pathname === '/login') {
      router.replace('/')
    }
  }, [loading, token, pathname, router])

  // Cập nhật badge & kết nối WebSocket khi đã đăng nhập
  useEffect(() => {
    if (!token) return
    refreshBadge()

    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closedByCleanup = false
    let retryDelay = 2000

    const connect = () => {
      if (closedByCleanup) return
      try {
        ws = new WebSocket(getWsUrl(token))
        ws.onopen = () => {
          retryDelay = 2000
        }
        ws.onmessage = (evt) => {
          try {
            const parsed = JSON.parse(evt.data) as WSEvent
            wsListenersRef.current.forEach((cb) => cb(parsed))
            refreshBadge()
          } catch {
            // Bỏ qua payload không phải JSON
          }
        }
        ws.onclose = () => {
          if (!closedByCleanup) {
            reconnectTimer = setTimeout(connect, retryDelay)
            retryDelay = Math.min(retryDelay * 2, 30000)
          }
        }
        ws.onerror = () => {
          ws?.close()
        }
      } catch {
        if (!closedByCleanup) {
          reconnectTimer = setTimeout(connect, retryDelay)
        }
      }
    }

    connect()
    return () => {
      closedByCleanup = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [token, refreshBadge])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password)
      setStoredAuth(res.token, res.nguoi_dung)
      setToken(res.token)
      setUser(res.nguoi_dung)
      router.replace('/')
    },
    [router]
  )

  const refreshUser = useCallback(async () => {
    const me = await authApi.getMe()
    setUser(me)
    setStoredUser(me)
  }, [])

  // Khi đang kiểm tra đăng nhập ở trang bảo vệ
  const isProtected = pathname !== '/login'
  if (loading && isProtected) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3 px-6">
        <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-md animate-pulse">
          <span className="material-symbols-outlined text-[1.625rem]">storefront</span>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">Đang tải MiuMiu Atelier...</span>
      </div>
    )
  }

  if (!loading && !token && isProtected) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeOrderBadge,
        login,
        logout,
        refreshUser,
        refreshBadge,
        subscribeWS,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export function useWSEvents(handler: WSCallback) {
  const { subscribeWS } = useAuth()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    return subscribeWS((evt) => handlerRef.current(evt))
  }, [subscribeWS])
}
