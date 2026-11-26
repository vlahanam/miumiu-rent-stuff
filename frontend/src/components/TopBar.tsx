'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { getInitials } from '@/lib/format'

interface TopBarProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  hideBackOnDesktop?: boolean
  rightSlot?: React.ReactNode
  maxWidth?: 'default' | 'narrow'
}

export default function TopBar({
  title,
  subtitle,
  backHref,
  backLabel = 'Quay lại',
  hideBackOnDesktop = false,
  rightSlot,
  maxWidth = 'default',
}: TopBarProps) {
  const { user } = useAuth()
  const maxWidthClass = maxWidth === 'narrow' ? 'lg:max-w-5xl' : 'lg:max-w-7xl'

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-xl pt-safe border-b border-outline-variant/20 shadow-[0_1px_8px_rgba(107,33,63,0.04)] print:hidden">
      <div
        className={`w-full max-w-2xl md:max-w-3xl ${maxWidthClass} mx-auto h-14 lg:h-16 px-margin lg:px-8 flex items-center justify-between gap-space-sm lg:gap-4`}
      >
        <div className="flex items-center gap-space-sm lg:gap-3 min-w-0 flex-1">
          {backHref ? (
            <>
              <Link
                href={backHref}
                aria-label={backLabel}
                className="w-9 h-9 rounded-full bg-surface-container-high flex lg:hidden items-center justify-center text-on-surface hover:bg-surface-container transition-colors shrink-0 active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </Link>
              {!hideBackOnDesktop && (
                <Link
                  href={backHref}
                  className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/25 font-label-md transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>{backLabel}</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/"
              className="w-9 h-9 rounded-full bg-primary-fixed/60 flex lg:hidden items-center justify-center text-primary-container shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
            </Link>
          )}
          <div className="flex flex-col min-w-0">
            <h1 className="font-headline-md text-headline-md lg:text-[20px] lg:font-bold tracking-tight text-on-surface truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <span className="font-label-sm text-[11px] lg:text-[12px] text-on-surface-variant truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightSlot}
          <Link
            href="/cai-dat"
            title={user ? `${user.ten} (${user.email})` : 'Cài đặt'}
            className="w-8 h-8 rounded-full bg-primary text-on-primary flex lg:hidden items-center justify-center font-label-md text-[12px] font-bold shrink-0 hover:bg-primary-container transition-colors"
          >
            {user ? getInitials(user.ten) : <span className="material-symbols-outlined text-[18px]">person</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}
