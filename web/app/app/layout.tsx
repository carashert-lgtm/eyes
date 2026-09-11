import { EyesAccountProvider } from '@/components/providers/EyesAccountProvider'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EyesAccountProvider>{children}</EyesAccountProvider>
}
