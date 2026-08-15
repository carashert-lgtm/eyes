import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'

const windowRules = [
  'Timed gated buy period before open trading',
  'Only pair and fee router can distribute tokens',
  'Wallet-to-wallet transfers blocked during window',
  'Sells blocked — snipers cannot dump into early buyers',
  '100% LP locked permanently at seed',
]

export function EyesWindowSection() {
  return (
    <section className="border-t border-border py-24 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="Fair distribution"
            title="Eyes Window supports healthier token distribution."
            description="Tokenomics do not work if bots own the chart on day one. The Eyes Window forces a controlled opening where real participants get access first."
          />

          <div className="rounded-sm border border-edge/20 bg-gradient-to-br from-edge/5 via-surface to-background p-8">
            <p className="font-mono-label text-edge">Eyes Window rules</p>
            <ul className="mt-6 space-y-4">
              {windowRules.map((rule) => (
                <li key={rule} className="flex gap-3 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-edge" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-border pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Healthier distribution means more organic holders, more sustained
                volume, and more fees flowing into the $EYES buy-and-burn loop.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
