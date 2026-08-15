import { Section, Eyebrow } from '@/components/ui/Section'
import { Rocket, Lock, Coins, Search, ScanEye, Cpu } from 'lucide-react'

const FEATURES = [
  {
    icon: Rocket,
    title: 'One-click launch',
    body: 'Deploy a fair launch with sane defaults — fee split, lock, and Eyes Window preset before you sign.',
  },
  {
    icon: Lock,
    title: 'Permanent LP lock',
    body: 'Liquidity is locked on-chain at pool creation. No timelock to expire, no rug vector to worry about.',
  },
  {
    icon: Coins,
    title: 'Creator fees',
    body: 'Earn a transparent 50% of the 1% trading fee, settled on-chain with no custodial middle layer.',
  },
  {
    icon: Search,
    title: 'Discovery & search',
    body: 'Browse and filter live launches, track window status, and find real projects fast.',
  },
  {
    icon: ScanEye,
    title: 'Full transparency',
    body: 'Every fee, buy, and burn is verifiable on-chain — nothing is self-reported.',
  },
  {
    icon: Cpu,
    title: 'Keeper automation',
    body: 'A keeper works the burn queue automatically so the flywheel runs without manual intervention.',
  },
]

export function Features() {
  return (
    <Section id="features">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex justify-center">
          <Eyebrow>Platform</Eyebrow>
        </div>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
          Built for operators and buyers who hate surprises.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Premium infrastructure, sharp guardrails, and the tooling to run
          launches without babysitting contracts.
        </p>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.title}
              className="group rounded-sm border border-border bg-surface p-6 transition-colors duration-300 hover:border-primary/40"
            >
              <span className="grid h-10 w-10 place-items-center rounded-sm border border-border bg-background text-primary transition-colors group-hover:border-primary/40">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-foreground">
                {f.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
