'use client'

interface TopBarProps {
  title: string
  showSearch?: boolean
}

export default function TopBar({ title, showSearch = true }: TopBarProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(107,33,63,0.04)]">
      <div className="h-14 px-margin flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container shrink-0">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface truncate">
              {title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs shrink-0">
          {showSearch && (
            <button
              aria-label="Tìm kiếm nhanh"
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  )
}
