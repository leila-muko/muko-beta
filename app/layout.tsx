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
      path: './fonts/test-soehne-breit-extraleicht.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: './fonts/test-soehne-breit-leicht.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/test-soehne-breit-buch.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/test-soehne-breit-kraftig.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/test-soehne-breit-halbfett.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/test-soehne-breit-dreiviertelfett.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/test-soehne-breit-fett.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: './fonts/test-soehne-breit-extrafett.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-sohne-breit',
  display: 'swap',
});

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