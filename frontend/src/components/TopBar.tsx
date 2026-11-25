'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { getInitials } from '@/lib/format'

interface TopBarProps {
  title: string
  subtitle?: string
  backHref?: string
  rightSlot?: React.ReactNode
}

export default function TopBar({ title, subtitle, backHref, rightSlot }: TopBarProps) {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(107,33,63,0.05)]">
      <div className="max-w-2xl mx-auto h-14 px-margin flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0 flex-1">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Quay lại"
              className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors shrink-0 active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
          ) : (
            <Link
              href="/"
              className="w-9 h-9 rounded-full bg-primary-fixed/60 flex items-center justify-center text-primary-container shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
            </Link>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface truncate leading-tight">
              {title}
            </span>
            {subtitle && (
              <span className="font-label-sm text-[11px] text-on-surface-variant truncate">{subtitle}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
          <Link
            href="/cai-dat"
            title={user ? `${user.ten} (${user.email})` : 'Cài đặt'}
            className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-[12px] font-bold shrink-0 hover:bg-primary-container transition-colors"
          >
            {user ? getInitials(user.ten) : <span className="material-symbols-outlined text-[18px]">person</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}
