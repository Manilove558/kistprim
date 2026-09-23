import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Google_Sans } from 'next/font/google'
import './globals.css'
// i have aded
const googleSans = Google_Sans({ subsets: ['latin'], variable: '--font-title' })

export const metadata: Metadata = {
  title: "Konark Institute Of Science And Technology",
  description: 'A premium photo gallery from Solasta — the Batch 26 freshers party at Konark Institute Of Science And Technology.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

const gaId = process.env.NEXT_PUBLIC_GA_ID

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`antialiased ${googleSans.variable}`}>
        {children}
        {process.env.NODE_ENV === 'production' && gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  )
}
