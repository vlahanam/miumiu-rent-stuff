'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError } from '@/lib/api'

const atelierHighlights = [
  {
    icon: 'bolt',
    title: 'Lập phiếu nhanh trong 1 phút',
    desc: 'Tự động tính tiền thuê, gợi ý tiền cọc và cập nhật trạng thái trang phục.',
  },
  {
    icon: 'event_available',
    title: 'Kiểm soát lịch thuê & quá hạn',
    desc: 'Cảnh báo trùng lịch đặt trước và nhắc đơn đến hạn trả ngay tại Tổng quan.',
  },
  {
    icon: 'query_stats',
    title: 'Báo cáo & thu hồi vốn rõ ràng',
    desc: 'Theo dõi doanh thu hàng tháng, hiệu quả từng bộ áo dài và xuất Excel/CSV.',
  },
]

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
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-6 py-10 lg:px-10 lg:py-12">
      <div className="w-full max-w-sm lg:max-w-5xl lg:bg-surface-container-lowest lg:rounded-3xl lg:shadow-[0_24px_60px_-14px_rgba(79,9,41,0.14),0_2px_8px_rgba(0,0,0,0.03)] lg:border lg:border-outline-variant/25 lg:overflow-hidden lg:grid lg:grid-cols-12">
        {/* Desktop Brand Showcase Panel */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-10 xl:p-12 bg-gradient-to-br from-primary via-primary-container to-[#3e001e] text-on-primary relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-secondary-container/15 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-[26px] text-on-primary">storefront</span>
            </div>
            <div>
              <div className="font-headline-lg text-[20px] font-bold tracking-tight leading-tight">
                MiuMiu Atelier
              </div>
              <div className="font-label-sm text-primary-fixed/85">
                Hệ thống quản lý nội bộ
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-6 my-8">
            <div>
              <h1 className="font-headline-xl text-[30px] leading-[1.2] font-bold tracking-tight">
                Quản lý tiệm áo dài tinh gọn &amp; chuẩn xác
              </h1>
              <p className="font-body-md text-[14px] text-primary-fixed/85 mt-3 leading-relaxed">
                Đồng bộ thao tác giữa quầy thu ngân trên máy tính và di động cho chủ tiệm cùng nhân viên.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {atelierHighlights.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[19px] text-secondary-fixed">
                      {item.icon}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-sm text-[14px] text-on-primary font-semibold">
                      {item.title}
                    </span>
                    <span className="font-body-sm text-[12.5px] text-primary-fixed/80 mt-0.5 leading-snug">
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/15 text-[12px] text-primary-fixed/75">
            <span>MiuMiu Rent Stuff</span>
            <span>Áo dài &amp; Phụ kiện truyền thống</span>
          </div>
        </div>

        {/* Form Column */}
        <div className="w-full lg:col-span-6 flex flex-col justify-center gap-6 lg:p-10 xl:p-12">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden flex-col items-center text-center gap-3">
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
            className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_28px_-4px_rgba(107,33,63,0.08),0_1px_3px_0_rgba(0,0,0,0.03)] border border-primary-container/10 lg:p-0 lg:shadow-none lg:border-0 lg:bg-transparent flex flex-col gap-4 lg:gap-5"
          >
            <div className="flex flex-col gap-1">
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed/60 text-primary font-label-sm w-fit mb-1">
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                Cổng nhân viên
              </span>
              <h2 className="font-headline-md text-headline-md lg:text-[24px] lg:font-bold text-on-surface">
                Đăng nhập nhân viên
              </h2>
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

          <p className="text-center lg:text-left font-label-sm text-label-sm text-outline">
            Hệ thống nội bộ MiuMiu Rent Stuff
          </p>
        </div>
      </div>
    </div>
  )
}
