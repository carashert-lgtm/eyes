import { Section, Eyebrow } from '@/components/ui/Section'

const CARDS = [
  {
    n: '01',
    title: 'Snipers own block zero',
    body: 'Bots sit on the mempool and fill the first blocks before humans can react. You click buy — they already won.',
  },
  {
    n: '02',
    title: 'Bundlers extract the window',
    body: 'Private bundles and coordinated wallets drain the opening range, then dump into early buyers who thought they were early.',
  },
  {
    n: '03',
    title: 'Multi-wallet games',
    body: 'Insiders spin up dozens of wallets, fake decentralization, and route volume through themselves while retail eats slippage.',
  },
]

export function Problem() {
  return (
    <Section id="problem">
      <div className="max-w-2xl">
        <Eyebrow tone="rose">The problem</Eyebrow>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
          Normal launches are rigged before you arrive.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Most launchpads optimize for hype, not fairness. The same playbook
          repeats: bots first, humans last, liquidity treated as exit liquidity.
        </p>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => (
          <div
            key={card.n}
            className="group relative overflow-hidden rounded-sm border border-border bg-surface p-6 transition-colors duration-300 hover:border-edge/40"
          >
            {/* Rose edge accent line on hover */}
            <span className="absolute left-0 top-0 h-full w-px origin-top scale-y-0 bg-edge transition-transform duration-300 group-hover:scale-y-100" />
            <span className="font-mono text-sm text-edge/70">{card.n}</span>
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">
              {card.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {card.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}
