import type { Metadata, Viewport } from 'next'
import { Syne, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Eyes Open | $EYES — Fair Launch Pad',
  description:
    'Eyes Open. No Snipers. No Games. The fair-launch platform with Eyes Window gating, permanent LP lock, and trading fees that buy and burn $EYES.',
  openGraph: {
    title: 'Eyes Open | $EYES',
    description: 'Eyes Open. No Snipers. No Games.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#faf7f0',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="antialiased">
        <div className="relative min-h-screen overflow-x-hidden bg-background">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 bg-grid opacity-40 mask-fade-b"
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-scan"
          />
          <Header />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
