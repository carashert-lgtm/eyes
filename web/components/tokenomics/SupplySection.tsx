import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StatCard } from '@/components/ui/DiagramCard'
import {
  EYES_TOTAL_SUPPLY,
  FOUNDER_SHARE,
  formatTokensFull,
  formatTokensShort,
} from '@/lib/founder-share-config'

const supplyFacts = [
  {
    label: 'Total supply',
    value: formatTokensFull(EYES_TOTAL_SUPPLY),
    suffix: 'Fixed forever',
    dense: true,
  },
  {
    label: 'Minting',
    value: 'One-time',
    suffix: 'At deployment only',
  },
  {
    label: 'Owner allocation',
    value: `${FOUNDER_SHARE.totalPercent}%`,
    suffix: `${formatTokensShort(FOUNDER_SHARE.totalTokens)} disclosed`,
  },
]

export function SupplySection() {
  return (
    <section className="border-t border-border py-24 lg:py-32">
      <Container>
        <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <SectionHeading
            eyebrow="Supply"
            title="One billion $EYES. No surprise inflation."
            description={`The full supply is minted once at deployment. Owner allocation (${FOUNDER_SHARE.totalPercent}%) is published in docs. LP and treasury inventory use separate buckets.`}
          />

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {supplyFacts.map((fact) => (
                <StatCard key={fact.label} {...fact} />
              ))}
            </div>

            <div className="rounded-sm border border-border bg-surface p-6">
              <h3 className="font-display text-lg font-bold text-foreground">
                Fair launch through the platform itself
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                $EYES is distributed through the same infrastructure Eyes Open
                provides to every project — transparent liquidity, enforced rules,
                and on-chain accountability. The platform eats its own cooking.
              </p>
              <p className="mt-4 font-mono-label text-muted-foreground">
                Owner allocation: {FOUNDER_SHARE.totalPercent}% (
                {formatTokensShort(FOUNDER_SHARE.totalTokens)} $EYES)
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
