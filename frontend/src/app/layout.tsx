import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'
import { AuthProvider } from '@/components/AuthProvider'
import { ZoomGuard } from '@/components/ZoomGuard'

export const metadata: Metadata = {
  title: 'MiuMiu - Quản Lý Tiệm Thuê Áo Dài',
  description: 'Hệ thống quản lý cho thuê áo dài và phụ kiện MiuMiu',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-on-surface antialiased min-h-screen">
        <ZoomGuard />
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
