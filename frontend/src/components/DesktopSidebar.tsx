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
        className={`group relative flex items-center justify-between gap-3 px-3.5 h-11 rounded-xl font-body-md text-[14px] transition-all ${
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
            className={`material-symbols-outlined text-[21px] shrink-0 transition-colors ${
              isActive ? 'text-primary-container' : 'text-on-surface-variant group-hover:text-on-surface'
            }`}
            style={isActive ? { fontVariationSettings: '"FILL" 1' } : {}}
          >
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </div>
        {item.hasBadge && activeOrderBadge > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-error text-on-error font-label-sm text-[11px] leading-none flex items-center justify-center font-bold shrink-0">
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
              <span className="material-symbols-outlined text-[22px]">storefront</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-md text-[17px] font-bold text-primary tracking-tight leading-tight truncate">
                MiuMiu Atelier
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant truncate">
                Quản lý thuê áo dài
              </span>
            </div>
          </Link>
        </div>

        {/* Quick Primary CTA */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <Link
            href="/don-thue/tao-moi"
            className={`w-full h-11 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-sm text-[14px] font-bold flex items-center justify-center gap-2 shadow-[0_6px_18px_-3px_rgba(107,33,63,0.38)] transition-all active:scale-[0.98] ${
              pathname === '/don-thue/tao-moi' ? 'ring-2 ring-primary-fixed ring-offset-2' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Thêm đơn thuê</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="px-3.5 pb-1 font-label-sm text-[11px] uppercase tracking-wider text-outline">
              Vận hành tiệm
            </span>
            {primaryNav.map(renderNavLink)}
          </div>

          <div className="flex flex-col gap-1">
            <span className="px-3.5 pb-1 font-label-sm text-[11px] uppercase tracking-wider text-outline">
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
              <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-[13px] font-bold shrink-0 group-hover:bg-primary-container transition-colors">
                {user ? (
                  getInitials(user.ten)
                ) : (
                  <span className="material-symbols-outlined text-[18px]">person</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-title-sm text-[13px] text-on-surface truncate leading-tight">
                  {user?.ten || 'Nhân viên'}
                </span>
                <span className="font-label-sm text-[11px] text-on-surface-variant truncate">
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
              <span className="material-symbols-outlined text-[19px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl space-y-4">
            <h4 className="font-headline-md text-on-surface">Đăng xuất khỏi MiuMiu?</h4>
            <p className="font-body-sm text-on-surface-variant">
              Bạn sẽ cần đăng nhập lại bằng email và mật khẩu để tiếp tục sử dụng.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high font-label-md transition-colors"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout()
                }}
                className="flex-1 h-10 rounded-xl bg-error text-on-error font-label-md font-bold hover:opacity-90 transition-opacity"
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
