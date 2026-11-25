'use client'

import Link from 'next/link'

interface AddButtonProps {
  label?: string
  href?: string
}

export default function AddButton({ label = 'Thêm đơn thuê', href = '/don-thue/tao-moi' }: AddButtonProps) {
  return (
    <Link
      href={href}
      className="fixed right-margin bottom-20 z-40 h-12 px-space-lg rounded-full bg-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(107,33,63,0.35)] flex items-center gap-space-xs hover:bg-primary transition-all active:scale-95"
    >
      <span className="material-symbols-outlined text-[20px]">add</span>
      <span className="font-title-sm text-title-sm tracking-tight">{label}</span>
    </Link>
  )
}
