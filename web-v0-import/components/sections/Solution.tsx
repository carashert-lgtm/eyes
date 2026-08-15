import { Section, Eyebrow } from '@/components/ui/Section'

const PILLARS = [
  {
    title: 'Eyes Window',
    body: 'A gated buy period where only the pair and router can distribute tokens — no peer-to-peer transfers, no sells.',
    highlight: 'Real users first.',
  },
  {
    title: 'Fair launch mechanics',
    body: 'One supply, no hidden mint, and liquidity locked on-chain the moment the pool goes live.',
    highlight: 'Rules enforced in code.',
  },
  {
    title: 'Anti-extraction by design',
    body: 'Snipers and bundlers are structurally blocked during the window, so the opening range belongs to buyers.',
    highlight: 'No games.',
  },
]

export function Solution() {
  return (
    <Section id="solution">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>The solution</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            Eyes Open changes who gets to buy first.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            We built a launch flow that protects the opening window, locks
            liquidity permanently, and routes value back to the platform token.
          </p>
        </div>

        <ul className="flex flex-col gap-4">
          {PILLARS.map((p) => (
            <li
              key={p.title}
              className="relative rounded-sm border border-border bg-surface p-6 pl-7"
            >
              <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-sm bg-primary" />
              <h3 className="font-display text-xl font-bold text-foreground">
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p.body}
              </p>
              <p className="mt-4 font-mono-label text-primary">{p.highlight}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
