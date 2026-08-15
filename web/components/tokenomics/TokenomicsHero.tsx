import { Container } from '@/components/ui/Container'
import { CtaButton } from '@/components/ui/CtaButton'
import { SocialLinks } from '@/components/layout/SocialLinks'
import { ROUTES } from '@/lib/site-config'

export function TokenomicsHero() {
  return (
    <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-20">
      <Container>
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5">
            <span className="font-mono-label text-primary">$EYES</span>
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Tokenomics built on{' '}
            <span className="text-gradient-white">real volume</span>, not hype.
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            $EYES captures value from every fair launch on Eyes Open. Trading
            activity routes fees to creators and a perpetual buy-and-burn engine
            — platform growth directly reduces supply.
          </p>

          <p className="mt-4 font-mono-label text-muted-foreground">
            Eyes Open. No Snipers. No Games.
          </p>
        </div>
      </Container>
    </section>
  )
}

export function TokenomicsCta() {
  return (
    <section className="border-t border-border py-24 lg:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-sm border border-border bg-surface px-8 py-16 text-center lg:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 60% at 50% 20%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.06) 42%, transparent 72%)',
            }}
          />

          <p className="relative font-mono-label text-primary">Next steps</p>
          <h2 className="relative mt-4 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
            Put the flywheel to work.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
            Explore the platform, read the mechanics, or get ready to launch fair.
          </p>

          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
            <CtaButton href={ROUTES.app}>Launch App</CtaButton>
            <CtaButton href={ROUTES.home} variant="secondary">
              Back to Home
            </CtaButton>
          </div>

          <div className="relative mt-6 flex flex-col items-center gap-3">
            <SocialLinks />
          </div>
        </div>
      </Container>
    </section>
  )
}
