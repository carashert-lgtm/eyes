import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import {
  BuyBurnLoopDiagram,
  FeeSplitDiagram,
  LaunchTradeBurnDiagram,
} from '@/components/tokenomics/Diagrams'

const flywheelPoints = [
  {
    title: '1% trading fee',
    body: 'Every swap on a platform-launched token routed through EyesFeeRouter pays a 1% fee — enforced in the router, not optional.',
  },
  {
    title: '50% to creator',
    body: 'Half the fee goes directly to the launch creator in ETH, instantly on-chain. Real revenue for builders who ship fair.',
  },
  {
    title: '50% buy & burn $EYES',
    body: 'The other half queues ETH for the buy-and-burn executor — swapped into $EYES on-market and burned permanently.',
  },
]

export function FeeFlywheelSection() {
  return (
    <section className="border-t border-border py-24 lg:py-32">
      <Container>
        <SectionHeading
          eyebrow="Fee flywheel"
          title="Every trade feeds the machine."
          description="Launch token volume doesn't leak to mercenary middlemen. It pays creators and destroys $EYES — a closed loop tied to platform activity."
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {flywheelPoints.map((point, index) => (
            <article
              key={point.title}
              className="rounded-sm border border-border bg-surface p-6"
            >
              <span className="font-mono text-xs text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 font-display text-lg font-bold text-foreground">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {point.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <FeeSplitDiagram />
          <BuyBurnLoopDiagram />
        </div>

        <div className="mt-6">
          <LaunchTradeBurnDiagram />
        </div>

        <div className="mt-8 rounded-sm border border-border bg-background px-5 py-4">
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            Note: Launch tokens themselves are not burned by default — the burn
            mechanic targets $EYES, linking every launch&apos;s trading volume to
            platform-token deflation.
          </p>
        </div>
      </Container>
    </section>
  )
}
