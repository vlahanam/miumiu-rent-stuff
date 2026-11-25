'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { path: '/', label: 'Tổng quan', icon: 'dashboard', filled: true },
  { path: '/don-thue', label: 'Đơn thuê', icon: 'receipt_long', badge: 2 },
  { path: '/san-pham', label: 'Sản phẩm', icon: 'checkroom' },
  { path: '/khach-hang', label: 'Khách hàng', icon: 'group' },
  { path: '/cai-dat', label: 'Cài đặt', icon: 'grid_view' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(35,31,32,0.04)]">
      <div className="flex justify-around items-center h-16 px-space-xs">
        {navItems.map((item) => {
          const isActive = pathname === item.path
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
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary-container text-on-primary font-label-sm text-[10px] leading-none flex items-center justify-center font-bold">
                    {item.badge}
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
