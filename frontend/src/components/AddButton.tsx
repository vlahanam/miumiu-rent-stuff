'use client'

import Link from 'next/link'

interface AddButtonProps {
  label?: string
  href?: string
}

export default function AddButton({ label = 'Thêm đơn thuê', href = '/don-thue/tao-moi' }: AddButtonProps) {
  return (
    <div className="lg:hidden fixed bottom-20 inset-x-0 z-40 pointer-events-none print:hidden">
      <div className="max-w-2xl md:max-w-3xl mx-auto px-margin flex justify-end">
        <Link
          href={href}
          className="pointer-events-auto h-12 px-5 rounded-full bg-primary-container text-on-primary shadow-[0_8px_20px_-2px_rgba(107,33,63,0.35)] flex items-center gap-1.5 hover:bg-primary transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span className="font-title-sm text-title-sm tracking-tight">{label}</span>
        </Link>
      </div>
    </div>
  )
}
