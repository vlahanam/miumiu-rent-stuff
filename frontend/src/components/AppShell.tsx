'use client'

import React from 'react'
import DesktopSidebar from '@/components/DesktopSidebar'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'

interface AppShellProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  hideBackOnDesktop?: boolean
  rightSlot?: React.ReactNode
  fab?: boolean | { label?: string; href?: string }
  maxWidth?: 'default' | 'narrow'
  children: React.ReactNode
}

export default function AppShell({
  title,
  subtitle,
  backHref,
  backLabel,
  hideBackOnDesktop = false,
  rightSlot,
  fab = false,
  maxWidth = 'default',
  children,
}: AppShellProps) {
  const maxWidthClass = maxWidth === 'narrow' ? 'lg:max-w-5xl' : 'lg:max-w-7xl'
  const fabConfig = typeof fab === 'object' ? fab : fab ? {} : null

  return (
    <div className="min-h-screen flex flex-col bg-surface lg:pl-64 print:pl-0">
      <DesktopSidebar />

      <TopBar
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        hideBackOnDesktop={hideBackOnDesktop}
        rightSlot={rightSlot}
        maxWidth={maxWidth}
      />

      <main
        className={`flex-1 flex flex-col relative w-full max-w-2xl md:max-w-3xl ${maxWidthClass} mx-auto px-margin lg:px-8 pt-4 lg:pt-6 ${
          fabConfig ? 'pb-32' : 'pb-24'
        } lg:pb-10 bg-surface print:max-w-none print:p-0`}
      >
        {children}
      </main>

      {fabConfig && <AddButton label={fabConfig.label} href={fabConfig.href} />}
      <BottomNav />
    </div>
  )
}
