import { Section, Eyebrow } from '@/components/ui/Section'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES, STATUS } from '@/lib/site-config'

export function FinalCta() {
  return (
    <Section id="launch">
      <div className="relative overflow-hidden rounded-sm border border-border bg-surface px-6 py-20 text-center lg:py-28">
        {/* Radial gold glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 20%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.06) 42%, transparent 72%)',
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />

        <div className="relative mx-auto max-w-2xl">
          <div className="flex justify-center">
            <Eyebrow>Ready when you are</Eyebrow>
          </div>
          <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
            Open your eyes. Launch fair.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Stop competing with bots for block zero. Deploy on Eyes Open, lock
            liquidity forever, and route trading fees through the $EYES buy-and-burn
            flywheel.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <CtaButton href={ROUTES.app}>Launch App</CtaButton>
            <CtaButton href={ROUTES.tokenomics} variant="secondary">
              Read Tokenomics
            </CtaButton>
          </div>

          <p className="mt-8 font-mono-label text-[0.62rem] text-muted-foreground">
            {STATUS.networkDetail}
          </p>
        </div>
      </div>
    </Section>
  )
}
