import { Section, Eyebrow } from '@/components/ui/Section'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES } from '@/lib/site-config'

const POOL_ITEMS = [
  'Content distribution and campaign execution',
  'Community growth and channel setup',
  'Launch visibility and outreach',
  'Creator and partner coordination',
]

export function LaunchSupport() {
  return (
    <Section id="launch-support">
      <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
        {/* Left */}
        <div>
          <Eyebrow>Pre-launch</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            14-day presale window.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Before public launch, we run a fixed community bootstrap presale.
            Proceeds form a pre-launch growth pool — 100% allocated to
            launch visibility and distribution. Separate from on-chain
            trading-fee tokenomics.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <CtaButton href={ROUTES.presale}>Join Presale</CtaButton>
            <a
              href={ROUTES.launchSupport}
              className="text-sm text-primary underline-offset-4 transition-colors hover:text-accent-glow hover:underline"
            >
              Read full details →
            </a>
          </div>

          <p className="mt-8 max-w-md text-xs leading-relaxed text-muted-foreground/80">
            Operational support only. This is not a trading-fee mechanism and
            not financial advice.
          </p>
        </div>

        {/* Right card */}
        <div className="rounded-sm border border-border bg-surface p-7 lg:p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono-label text-primary">
              Pre-launch growth pool
            </span>
            <span className="rounded-sm border border-border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground">
              14 days
            </span>
          </div>

          <ul className="mt-6 flex flex-col divide-y divide-border/70">
            {POOL_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-3 py-4">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="text-sm text-foreground">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-sm border border-border bg-background/60 px-4 py-3">
            <span className="font-mono-label text-[0.6rem] text-muted-foreground">
              100% allocated to launch visibility & distribution
            </span>
          </div>
        </div>
      </div>
    </Section>
  )
}
