// /app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

const sohneBreit = localFont({
  src: [
    {
      path: './fonts/TestSöhneBreit-Kraftig.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/TestSöhneBreit-Fett.otf',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-sohne-breit',
})

export const metadata: Metadata = {
  title: 'Muko - Decision Intelligence for Fashion',
  description: 'Intelligence-first design to prevent misdirection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sohneBreit.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}