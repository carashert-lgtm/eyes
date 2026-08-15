import { CtaButton } from '@/components/ui/CtaButton'
import { SpinningCoin } from '@/components/ui/SpinningCoin'
import { LaunchCountdown } from '@/components/ui/LaunchCountdown'
import { ROUTES } from '@/lib/site-config'

const STATS = [
  { label: 'LP lock', value: '100%' },
  { label: 'Trading fee', value: '1%' },
  { label: 'Snipers at T0', value: '0' },
]

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-scan" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-24 pt-28 text-center lg:px-8 lg:pb-32 lg:pt-32">
        {/* 1. Coin */}
        <SpinningCoin size={260} className="hidden sm:grid" />
        <SpinningCoin size={190} className="grid sm:hidden" />

        {/* 2. Countdown */}
        <div className="-mt-6 w-full sm:-mt-10">
          <LaunchCountdown />
        </div>

        {/* 3. Text block */}
        <div className="mt-12 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-sm border border-edge/30 bg-edge/5 px-3 py-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-edge"
              style={{
                animation: 'pulse-dot 2s ease-in-out infinite',
                boxShadow: '0 0 8px #b45309',
              }}
            />
            <span className="font-mono-label text-edge">Fair launch pad</span>
          </div>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.98] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            <span className="block text-foreground">Eyes Open.</span>
            <span className="block text-muted-foreground">No Snipers.</span>
            <span className="block text-gradient-white">No Games.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            The launch pad built for real buyers — gated Eyes Window entry,
            permanently locked liquidity, and every trade feeding the $EYES
            buy-and-burn flywheel.
          </p>

          {/* 4. CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <CtaButton href={ROUTES.app}>Launch App</CtaButton>
            <CtaButton href={ROUTES.tokenomics} variant="secondary">
              Read Tokenomics
            </CtaButton>
          </div>

          {/* Stat row */}
          <dl className="mt-12 grid w-full max-w-lg grid-cols-3 gap-4 border-t border-border pt-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="font-mono-label text-muted-foreground">
                  {s.label}
                </dt>
                <dd className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
