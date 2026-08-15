import { Wallet } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Section'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES } from '@/lib/site-config'

const TRUST_CHIPS = ['Wallet-only', 'No fiat', 'You sign the tx', 'Not financial advice']

export function PresaleHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-24">
      {/* Warm radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.04) 45%, transparent 74%)',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center lg:px-8">
        <Eyebrow>14 days · Pre-launch · Self-custodial</Eyebrow>

        <h1 className="mt-6 font-display text-6xl font-extrabold tracking-tight text-foreground text-balance sm:text-7xl">
          Presale
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          The community sends crypto directly from their own wallet to fund the launch
          growth pool — content, channels, and visibility. 100% goes to launch operations,
          nothing is held on your behalf.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {TRUST_CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono-label text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <CtaButton href="#buy" className="px-6 py-3 text-base">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </CtaButton>
          <a
            href={ROUTES.launchSupport}
            className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Read full details
          </a>
        </div>
      </div>
    </section>
  )
}
