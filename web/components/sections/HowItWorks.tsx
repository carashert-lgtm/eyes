import { Section, Eyebrow } from '@/components/ui/Section'

const STEPS = [
  {
    n: '01',
    title: 'Launch',
    body: 'Creator deploys the token with a 50/50 fee split by default and sets the Eyes Window parameters up front.',
  },
  {
    n: '02',
    title: 'Eyes Window',
    body: 'Liquidity is seeded and 100% locked. Buys are only accepted from the pair and router — snipers have nothing to front-run.',
  },
  {
    n: '03',
    title: 'Trade freely',
    body: 'The window closes and normal transfers resume. The market opens with real holders already in position.',
  },
  {
    n: '04',
    title: 'Fees buy & burn $EYES',
    body: 'A 1% trading fee splits 50% to the creator and 50% into the buy-and-burn queue for $EYES.',
  },
]

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex justify-center">
          <Eyebrow>How it works</Eyebrow>
        </div>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
          Four steps. Zero sniper privilege.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          From launch to open trading to on-chain fee routing — the full
          loop is auditable.
        </p>
      </div>

      <ol className="mx-auto mt-16 max-w-3xl">
        {STEPS.map((step, i) => (
          <li key={step.n} className="relative flex gap-6 pb-10 last:pb-0">
            {/* Timeline rail */}
            <div className="flex flex-col items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/10 font-mono text-sm text-primary">
                {step.n}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mt-2 w-px flex-1 bg-gradient-to-b from-primary/40 to-border" />
              )}
            </div>
            <div className="pt-1.5">
              <h3 className="font-display text-xl font-bold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}
