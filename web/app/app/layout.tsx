import { WalletProvider } from '@/lib/wallet-context'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WalletProvider>{children}</WalletProvider>
}
