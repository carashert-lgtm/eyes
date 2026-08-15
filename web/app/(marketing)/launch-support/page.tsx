import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { CtaButton } from '@/components/ui/CtaButton'
import { DiagramCard } from '@/components/ui/DiagramCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ROUTES } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Launch Support Window | Eyes Open ($EYES)',
  description:
    '14-day pre-launch community bootstrap window. 100% of the growth pool allocated to launch visibility and distribution — separate from trading-fee tokenomics.',
}

const poolUses = [
  {
    title: 'Content distribution',
    body: 'Posts, threads, and educational material so the launch narrative reaches the right audiences.',
  },
  {
    title: 'Community growth',
    body: 'Telegram, X, and partner channels set up for clear communication before go-live.',
  },
  {
    title: 'Launch visibility',
    body: 'Outreach and campaign execution so Eyes Open is discoverable when public launch opens.',
  },
  {
    title: 'Creator & partner outreach',
    body: 'Coordination with builders who may run curated fair launches on the pad.',
  },
]

const notIncluded = [
  'Not part of the 1% trading-fee or 50/50 creator / buy-burn model',
  'Not a promise of token price movement or personal financial outcome',
  'Not an investment product or securities offering',
  'Not discretionary team spend without published allocation intent',
]

export default function LaunchSupportPage() {
  return (
    <>
      <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20">
        <Container>
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5">
              <span className="font-mono-label text-primary">14 days · Pre-launch</span>
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Launch support window
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              A fixed{' '}
              <strong className="font-medium text-foreground">14-day</strong> period
              before public launch where community members can make a{' '}
              <strong className="font-medium text-foreground">bootstrap contribution</strong>{' '}
              to the pre-launch growth pool.{' '}
              <strong className="font-medium text-primary">100%</strong> of the pool is
              used for launch growth efforts — visibility, distribution, and campaign
              execution.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-20">
        <Container>
          <SectionHeading
            eyebrow="Purpose"
            title="Utility for launch readiness — not token trading mechanics."
            description="The growth pool funds operational marketing before go-live. It does not change the on-chain 50% creator / 50% buy & burn fee model documented in tokenomics."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <DiagramCard
              title="Where the pool goes"
              subtitle="100% allocated to launch visibility and distribution"
            >
              <ul className="space-y-4">
                {poolUses.map((item) => (
                  <li key={item.title}>
                    <p className="font-display text-sm font-bold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </li>
                ))}
              </ul>
            </DiagramCard>

            <DiagramCard
              title="Separate from tokenomics"
              subtitle="Trading fees ≠ launch support pool"
            >
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  After public launch, platform trading fees (1% via EyesFeeRouter)
                  follow the documented{' '}
                  <Link href={ROUTES.tokenomics} className="text-primary hover:underline">
                    50/50 split
                  </Link>
                  : half to creators, half to buy & burn $EYES.
                </p>
                <p>
                  The pre-launch growth pool is a{' '}
                  <strong className="text-foreground">one-time bootstrap window</strong>{' '}
                  for launch operations only. The two mechanisms are independent.
                </p>
              </div>
              <div className="mt-6 rounded-sm border border-edge/20 bg-edge/5 px-4 py-3">
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  Duration: 14 days · Then: window closes · Public launch phase begins
                </p>
              </div>
            </DiagramCard>
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-20">
        <Container>
          <SectionHeading
            eyebrow="Transparency"
            title="What this is — and what it is not."
            align="center"
            className="mx-auto"
          />

          <div className="mx-auto mt-12 max-w-2xl rounded-sm border border-border bg-surface p-8">
            <ul className="space-y-3">
              {notIncluded.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-edge">—</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs leading-relaxed text-muted-foreground/80">
              Contributions are voluntary support for launch operations. This page
              is not financial advice. Past campaign activity does not predict
              future outcomes. Do your own research.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-24">
        <Container>
          <div className="relative overflow-hidden rounded-sm border border-border bg-surface px-8 py-16 text-center lg:px-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(212,175,55,0.12), transparent 65%)',
              }}
            />
            <p className="relative font-mono-label text-primary">Launch support window</p>
            <h2 className="relative mt-4 font-display text-3xl font-bold text-foreground">
              Join launch support
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
              Make a bootstrap contribution to the pre-launch growth pool. 100%
              allocated to launch visibility and distribution.
            </p>
            <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
              <CtaButton href={ROUTES.presale}>Join Presale</CtaButton>
              <CtaButton href={ROUTES.tokenomics} variant="secondary">
                Read Tokenomics
              </CtaButton>
              <CtaButton href={ROUTES.home}>Back to Home</CtaButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
