'use client'

import {
  SAN_PHAM_TRANG_THAI_LABELS,
  THUE_DO_TRANG_THAI_LABELS,
  type SanPhamTrangThai,
  type ThueDoTrangThai,
} from '@/types'

const thueDoStyles: Record<ThueDoTrangThai, { badge: string; border: string; dot: string }> = {
  1: {
    badge: 'bg-[#FFF8E7] text-[#946E18]',
    border: 'bg-[#F0BE7B]',
    dot: 'bg-[#C99A5B]',
  },
  2: {
    badge: 'bg-[#FEF4E6] text-[#B57300]',
    border: 'bg-secondary-container',
    dot: 'bg-[#B57300]',
  },
  3: {
    badge: 'bg-[#EAF5EE] text-[#236B48]',
    border: 'bg-tertiary-container',
    dot: 'bg-[#236B48]',
  },
  4: {
    badge: 'bg-[#FDE8EB] text-[#C5283D]',
    border: 'bg-error',
    dot: 'bg-[#C5283D]',
  },
  5: {
    badge: 'bg-[#F1EFF4] text-[#61556C]',
    border: 'bg-outline',
    dot: 'bg-[#61556C]',
  },
}

const sanPhamStyles: Record<SanPhamTrangThai, { badge: string; dot: string }> = {
  1: { badge: 'bg-[#EAF5EE]/95 text-[#236B48]', dot: 'bg-[#236B48]' },
  2: { badge: 'bg-[#FEF4E6]/95 text-[#B57300]', dot: 'bg-[#B57300]' },
  3: { badge: 'bg-[#F1EFF4]/95 text-[#61556C]', dot: 'bg-[#61556C]' },
}

export function getThueDoStyle(status: ThueDoTrangThai) {
  return thueDoStyles[status] || thueDoStyles[1]
}

export function ThueDoStatusBadge({ status, className = '' }: { status: ThueDoTrangThai; className?: string }) {
  const style = thueDoStyles[status] || thueDoStyles[1]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold shrink-0 ${style.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{THUE_DO_TRANG_THAI_LABELS[status] || 'Không rõ'}</span>
    </span>
  )
}

export function SanPhamStatusBadge({ status, className = '' }: { status: SanPhamTrangThai; className?: string }) {
  const style = sanPhamStyles[status] || sanPhamStyles[1]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm font-label-sm text-[10px] leading-tight font-semibold shadow-sm shrink-0 ${style.badge} ${className}`}
    >
      {status === 3 ? (
        <span className="material-symbols-outlined text-[11px]">dry_cleaning</span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      )}
      <span>{SAN_PHAM_TRANG_THAI_LABELS[status] || 'Không rõ'}</span>
    </span>
  )
}
