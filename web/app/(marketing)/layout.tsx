import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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
  )
}
