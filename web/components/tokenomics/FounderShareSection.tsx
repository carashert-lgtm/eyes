import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StatCard } from '@/components/ui/DiagramCard'
import { FOUNDER_SHARE, formatTokensFull, formatTokensShort } from '@/lib/founder-share-config'

export function FounderShareSection() {
  return (
    <section className="border-t border-border py-24 lg:py-32">
      <Container>
        <SectionHeading
          eyebrow="Owner allocation"
          title={`${FOUNDER_SHARE.totalPercent}% disclosed upfront — not a hidden bag.`}
          description={`${formatTokensFull(FOUNDER_SHARE.totalTokens)} $EYES (${FOUNDER_SHARE.totalPercent}% of supply) is reserved for the owner.`}
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Owner allocation"
            value={`${FOUNDER_SHARE.totalPercent}%`}
            suffix={`${formatTokensShort(FOUNDER_SHARE.totalTokens)} $EYES`}
          />
          <StatCard
            label={FOUNDER_SHARE.owner.label}
            value={formatTokensFull(FOUNDER_SHARE.owner.tokens)}
            suffix="$EYES · single recipient"
            dense
          />
        </div>

        <div className="mt-8 rounded-sm border border-border bg-surface p-6">
          <h3 className="font-display text-lg font-bold text-foreground">Allocation breakdown</h3>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Owner — {FOUNDER_SHARE.owner.percent}%
              </strong>{' '}
              ({formatTokensFull(FOUNDER_SHARE.owner.tokens)} $EYES)
            </li>
          </ul>
          <p className="mt-4 font-mono-label text-muted-foreground">
            Vesting and unlock rules apply via Team Space / Discord — not instant liquid at launch.
            Not financial advice.
          </p>
        </div>
      </Container>
    </section>
  )
}
