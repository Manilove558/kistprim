import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Google_Sans } from 'next/font/google'
import './globals.css'
// i have aded
const googleSans = Google_Sans({ subsets: ['latin'], variable: '--font-title' })

// Site ka asli URL. OG image ka poora (absolute) link isi se banta hai.
// Netlify apne aap `URL` env var deta hai; custom domain ho to
// NEXT_PUBLIC_SITE_URL me daal dena (jaise https://solasta.kist.edu.in).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? 'http://localhost:3000'

const siteTitle = 'Solasta — Batch 26 Freshers Party | KIST'
const siteDescription =
  'A premium photo gallery from Solasta — the Batch 26 freshers party at Konark Institute Of Science And Technology.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Konark Institute Of Science And Technology", // browser tab ka title (pehle jaisa)
  description: siteDescription,
  // Open Graph: WhatsApp, Instagram, Facebook, LinkedIn link preview (photo + title) yahin se banta hai.
  openGraph: {
    type: 'website',
    siteName: 'Solasta — KIST',
    title: siteTitle,
    description: siteDescription,
    url: '/',
    locale: 'en_IN',
    images: [
      {
        url: '/og-image.jpg', // public/og-image.jpg (1200x630 — link preview ke liye best size)
        width: 1200,
        height: 630,
        alt: 'Solasta — the Batch 26 freshers party at Konark Institute Of Science And Technology',
      },
    ],
  },
  // Twitter/X aur kuch aur apps isi tag se preview banate hain.
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image.jpg'],
  },
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
      <head>
        {/* Yeh chhota script body render hone SE PEHLE chalta hai, taaki page load
            hote hi "flash" na ho (galat theme ek second dikh kar phir badal jaye).
            Pehle localStorage me saved choice dekhta hai; nahi mile to system
            (phone/laptop) ka prefers-color-scheme use karta hai. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`antialiased ${googleSans.variable}`}>
        {children}
        {process.env.NODE_ENV === 'production' && gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  )
}
