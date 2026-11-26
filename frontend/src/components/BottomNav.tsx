'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

const navItems = [
  { path: '/', label: 'Tổng quan', icon: 'dashboard', exact: true },
  { path: '/don-thue', label: 'Đơn thuê', icon: 'receipt_long', hasBadge: true },
  { path: '/san-pham', label: 'Sản phẩm', icon: 'checkroom' },
  { path: '/khach-hang', label: 'Khách hàng', icon: 'group' },
  { path: '/cai-dat', label: 'Thêm', icon: 'grid_view', extraMatch: ['/bao-cao'] },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { activeOrderBadge } = useAuth()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(35,31,32,0.05)] border-t border-outline-variant/20 print:hidden">
      <div className="max-w-2xl md:max-w-3xl mx-auto flex justify-around items-center h-16 px-space-xs">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.path
            : pathname === item.path ||
              pathname.startsWith(`${item.path}/`) ||
              (item.extraMatch?.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ?? false)

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-12 transition-colors relative ${
                isActive ? 'text-primary-container font-bold' : 'text-on-surface-variant'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: '"FILL" 1' } : {}}
                >
                  {item.icon}
                </span>
                {item.hasBadge && activeOrderBadge > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] leading-none flex items-center justify-center font-bold">
                    {activeOrderBadge > 99 ? '99+' : activeOrderBadge}
                  </span>
                )}
              </div>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
