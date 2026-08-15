import { ShieldCheck } from 'lucide-react'

export function DisclaimerBar() {
  return (
    <div className="border-t border-border bg-surface/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2.5 px-6 py-5 lg:px-8">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-center font-mono-label text-muted-foreground">
          Self-custodial wallet transaction · Testnet · Mainnet after audit · Not financial
          advice
        </p>
      </div>
    </div>
  )
}
