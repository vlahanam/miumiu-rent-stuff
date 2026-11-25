'use client'

import { useState } from 'react'
import { parseImages } from '@/lib/format'

interface ProductImageProps {
  hinhAnh?: string | null
  alt?: string
  className?: string
  iconSize?: number
}

export default function ProductImage({
  hinhAnh,
  alt = 'Trang phục MiuMiu',
  className = '',
  iconSize = 24,
}: ProductImageProps) {
  const images = parseImages(hinhAnh)
  const [failed, setFailed] = useState(false)

  if (images.length === 0 || failed) {
    return (
      <div className={`bg-primary-fixed/25 flex items-center justify-center ${className}`}>
        <span
          className="material-symbols-outlined text-primary-container"
          style={{ fontSize: `${iconSize}px` }}
        >
          checkroom
        </span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={images[0]}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
