'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.')
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      toast.success('Đăng nhập thành công!')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.'
      setErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-[0_12px_28px_-4px_rgba(107,33,63,0.3)]">
            <span className="material-symbols-outlined text-[34px]">storefront</span>
          </div>
          <div>
            <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight">MiuMiu Atelier</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Quản lý tiệm cho thuê áo dài &amp; phụ kiện
            </p>
          </div>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_28px_-4px_rgba(107,33,63,0.08),0_1px_3px_0_rgba(0,0,0,0.03)] border border-primary-container/10 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-md text-headline-md text-on-surface">Đăng nhập nhân viên</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Sử dụng tài khoản cửa hàng để thao tác tại quầy
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-label-md text-label-md text-on-surface">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                mail
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@miumiu.vn"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-label-md text-label-md text-on-surface">
              Mật khẩu
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                lock
              </span>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2 w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full h-12 rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_-2px_rgba(107,33,63,0.35)] hover:bg-primary disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>Đăng nhập</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center font-label-sm text-label-sm text-outline">
          Hệ thống nội bộ MiuMiu Rent Stuff
        </p>
      </div>
    </div>
  )
}
