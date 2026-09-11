import { Section, Eyebrow } from '@/components/ui/Section'
import {
  EYES_TOTAL_SUPPLY,
  FOUNDER_SHARE,
  formatTokensFull,
} from '@/lib/founder-share-config'

const FLYWHEEL = [
  'A new fair launch goes live on the pad and opens for trading.',
  'Every trade charges a 1% fee, routing 50% into the burn queue.',
  'A keeper executes queued buys of $EYES on the open market.',
  'Purchased $EYES is burned on-chain — supply only moves down.',
]

export function Token() {
  const tiles = [
    {
      label: 'Fixed supply',
      value: formatTokensFull(EYES_TOTAL_SUPPLY),
      unit: '$EYES',
      compact: true,
    },
    {
      label: 'Owner allocation',
      value: `${FOUNDER_SHARE.totalPercent}%`,
      unit: `${formatTokensFull(FOUNDER_SHARE.totalTokens)} $EYES`,
    },
    {
      label: 'Deflation',
      value: 'On-chain',
      unit: 'buy & burn',
    },
  ]

  return (
    <Section id="token">
      <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
        {/* Left */}
        <div>
          <Eyebrow>$EYES token</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
            The platform token tied to launch activity.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            $EYES is the settlement layer for Eyes Open — every fair launch on
            the pad feeds the same deflationary engine.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {tiles.map((t) => (
              <div
                key={t.label}
                className="rounded-sm border border-border bg-surface p-5"
              >
                <div className="font-mono-label text-muted-foreground">
                  {t.label}
                </div>
                <div
                  className={
                    t.compact
                      ? 'mt-3 font-display text-lg font-bold tabular-nums tracking-tight text-foreground sm:text-xl'
                      : 'mt-3 font-display text-xl font-bold text-foreground'
                  }
                >
                  {t.value}
                </div>
                <div className="mt-1 font-mono text-xs text-primary">{t.unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="rounded-sm border border-border bg-surface p-7 lg:p-8">
          <div className="font-mono-label text-primary">
            Fee → buy/burn flywheel
          </div>
          <h3 className="mt-4 font-display text-2xl font-bold text-foreground text-balance">
            More launches. More volume. Less $EYES.
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Fees flow into a transparent burn queue that a keeper works down
            automatically. Every step — the fee, the buy, and the burn — is
            visible on-chain, so the deflation is verifiable rather than
            promised.
          </p>

          <ol className="mt-7 flex flex-col gap-4">
            {FLYWHEEL.map((item, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm border border-border bg-background font-mono text-xs text-primary">
                  {i + 1}
                </span>
                <span className="pt-1 text-sm leading-relaxed text-muted-foreground">
                  {item}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-7 border-t border-border pt-5">
            <span className="font-mono-label text-[0.62rem] text-muted-foreground">
              split · 50% creator · 50% buy & burn $EYES
            </span>
          </div>
        </div>
      </div>
    </Section>
  )
}
