'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { getInitials } from '@/lib/format'

interface NavItem {
  path: string
  label: string
  icon: string
  exact?: boolean
  hasBadge?: boolean
}

const primaryNav: NavItem[] = [
  { path: '/', label: 'Tổng quan', icon: 'dashboard', exact: true },
  { path: '/don-thue', label: 'Đơn thuê', icon: 'receipt_long', hasBadge: true },
  { path: '/san-pham', label: 'Sản phẩm', icon: 'checkroom' },
  { path: '/khach-hang', label: 'Khách hàng', icon: 'group' },
]

const managementNav: NavItem[] = [
  { path: '/bao-cao', label: 'Báo cáo & Xuất file', icon: 'query_stats' },
  { path: '/cai-dat', label: 'Cài đặt cửa hàng', icon: 'tune' },
]

export default function DesktopSidebar() {
  const pathname = usePathname()
  const { user, activeOrderBadge, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const checkActive = (item: NavItem) =>
    item.exact
      ? pathname === item.path
      : pathname === item.path || pathname.startsWith(`${item.path}/`)

  const renderNavLink = (item: NavItem) => {
    const isActive = checkActive(item)
    return (
      <Link
        key={item.path}
        href={item.path}
        className={`group relative flex items-center justify-between gap-3 px-3.5 h-11 rounded-xl font-body-md text-[0.875rem] whitespace-nowrap transition-all ${
          isActive
            ? 'bg-primary-fixed/65 text-primary font-bold shadow-[inset_0_0_0_1px_rgba(107,33,63,0.12)]'
            : 'text-on-surface-variant font-medium hover:bg-surface-container-low hover:text-on-surface'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-primary-container" />
        )}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`material-symbols-outlined text-[1.3125rem] shrink-0 transition-colors ${
              isActive ? 'text-primary-container' : 'text-on-surface-variant group-hover:text-on-surface'
            }`}
            style={isActive ? { fontVariationSettings: '"FILL" 1' } : {}}
          >
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </div>
        {item.hasBadge && activeOrderBadge > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-error text-on-error font-label-sm text-[0.6875rem] leading-none flex items-center justify-center font-bold shrink-0">
            {activeOrderBadge > 99 ? '99+' : activeOrderBadge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 z-40 bg-surface-container-lowest border-r border-outline-variant/25 shadow-[2px_0_20px_rgba(79,9,41,0.03)] print:hidden">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-outline-variant/20 shrink-0">
          <Link href="/" className="flex items-center gap-3 min-w-0 group">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-[0_6px_14px_-3px_rgba(107,33,63,0.35)] shrink-0 group-hover:bg-primary transition-colors">
              <span className="material-symbols-outlined text-[1.375rem]">storefront</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-md text-[1.0625rem] font-bold text-primary tracking-tight leading-tight truncate">
                MiuMiu Atelier
              </span>
              <span className="font-label-sm text-[0.6875rem] text-on-surface-variant truncate">
                Quản lý thuê áo dài
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Primary CTA */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <Link
            href="/don-thue/tao-moi"
            className={`w-full h-11 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-sm text-[0.875rem] font-bold whitespace-nowrap flex items-center justify-center gap-2 shadow-[0_6px_18px_-3px_rgba(107,33,63,0.38)] transition-all active:scale-[0.98] ${
              pathname === '/don-thue/tao-moi' ? 'ring-2 ring-primary-fixed ring-offset-2' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[1.25rem]">add_circle</span>
            <span>Thêm đơn thuê</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="px-3.5 pb-1 font-label-sm text-[0.6875rem] uppercase tracking-wider text-outline">
              Vận hành tiệm
            </span>
            {primaryNav.map(renderNavLink)}
          </div>

          <div className="flex flex-col gap-1">
            <span className="px-3.5 pb-1 font-label-sm text-[0.6875rem] uppercase tracking-wider text-outline">
              Quản trị
            </span>
            {managementNav.map(renderNavLink)}
          </div>
        </nav>

        {/* Staff Account Footer */}
        <div className="p-3 border-t border-outline-variant/20 shrink-0 bg-surface-container-low/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl">
            <Link
              href="/cai-dat"
              className="flex items-center gap-2.5 min-w-0 flex-1 group"
              title="Cài đặt tài khoản"
            >
              <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-[0.8125rem] font-bold shrink-0 group-hover:bg-primary-container transition-colors">
                {user ? (
                  getInitials(user.ten)
                ) : (
                  <span className="material-symbols-outlined text-[1.125rem]">person</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-title-sm text-[0.8125rem] text-on-surface truncate leading-tight">
                  {user?.ten || 'Nhân viên'}
                </span>
                <span className="font-label-sm text-[0.6875rem] text-on-surface-variant truncate">
                  {user?.email || 'MiuMiu Rent Stuff'}
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error flex items-center justify-center transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[1.1875rem]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sidebar-logout-modal-title"
          className="fixed inset-0 z-[70] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />

          <div className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[1.75rem] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10">
            <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
              <h4
                id="sidebar-logout-modal-title"
                className="font-headline-md text-headline-md font-bold text-on-surface"
              >
                Đăng xuất khỏi MiuMiu?
              </h4>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[1.25rem]">close</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Bạn sẽ cần đăng nhập lại bằng email và mật khẩu để tiếp tục sử dụng.
              </p>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="shrink-0 min-w-[5.5rem] md:min-w-[7.5rem] h-11 md:h-12 px-4 md:px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold whitespace-nowrap transition-colors"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout()
                }}
                className="flex-1 md:flex-none md:min-w-[12.5rem] h-11 md:h-12 px-5 md:px-6 rounded-xl bg-error hover:opacity-90 text-on-error font-title-sm text-title-sm font-bold whitespace-nowrap shadow-md active:scale-95 transition-all"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
