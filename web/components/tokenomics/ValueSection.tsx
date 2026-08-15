import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'

const valueDrivers = [
  {
    title: 'Every launch increases activity',
    description:
      'Each fair launch adds a new trading pair, a new creator economy, and a new stream of routed volume through Eyes Open infrastructure.',
    metric: '↑ Launches',
  },
  {
    title: 'Every trade creates buy pressure',
    description:
      'Half of every fee is earmarked to purchase $EYES on the open market before burning — real demand, not synthetic staking rewards.',
    metric: '↑ Buy pressure',
  },
  {
    title: 'Burns reduce supply',
    description:
      'Executed burns are permanent and on-chain. No rebasing tricks, no burn that sends tokens to a dead wallet you can recover.',
    metric: '↓ Supply',
  },
  {
    title: 'Platform growth feeds the token',
    description:
      'More launches, more swaps, more fees — the flywheel compounds. $EYES is the settlement layer for the entire pad.',
    metric: '⟁ Flywheel',
  },
]

export function ValueSection() {
  return (
    <section className="border-t border-border py-24 lg:py-32">
      <Container>
        <SectionHeading
          eyebrow="Value capture"
          title="Why $EYES has value."
          description="Not because of a meme. Because every launch on the platform generates economic activity that routes back to the token."
          align="center"
          className="mx-auto"
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2">
          {valueDrivers.map((item) => (
            <article
              key={item.title}
              className="group relative overflow-hidden rounded-sm border border-border bg-surface p-8 transition hover:border-primary/30"
            >
              <span className="font-mono-label text-primary">{item.metric}</span>
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
              <div
                aria-hidden
                className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-primary to-transparent transition-all duration-500 group-hover:w-full"
              />
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
