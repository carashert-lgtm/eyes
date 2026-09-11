import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Launch embed · Eyes Open',
  robots: { index: false, follow: false },
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[220px] bg-background p-2">{children}</div>
}
