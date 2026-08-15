import type { Metadata, Viewport } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
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
