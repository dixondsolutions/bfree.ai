import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'B Free.AI - AI-Powered Email Scheduling Assistant',
  description: 'Automatically extract tasks and events from emails with intelligent calendar optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-blue-50 to-green-50 min-h-screen`}>{children}</body>
    </html>
  )
}