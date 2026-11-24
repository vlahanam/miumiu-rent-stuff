import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MiuMiu Rent Stuff',
  description: 'Dịch vụ cho thuê trang phục cao cấp',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  )
}
