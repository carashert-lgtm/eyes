import { Check, X } from 'lucide-react'
import { Section, Eyebrow } from '@/components/ui/Section'

const PROCEEDS = [
  'Content production and creative assets',
  'Community growth and moderation',
  'Visibility across channels and listings',
  'Outreach to partners and contributors',
]

const NOT = [
  'Not the 1% trading fee (50% creator / 50% buy & burn)',
  'Not a promise of ROI or token price',
  'Not an investment product or security',
  'Not undisclosed or discretionary spend',
]

export function Transparency() {
  return (
    <Section id="transparency">
      <Eyebrow>Transparency</Eyebrow>
      <h2 className="mt-5 max-w-2xl font-display text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
        Clear on where it goes — and what it isn&apos;t
      </h2>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {/* Proceeds */}
        <div className="rounded-md border border-border bg-card/60 p-8">
          <h3 className="font-display text-xl font-bold text-foreground">
            Where presale proceeds go
          </h3>
          <ul className="mt-6 flex flex-col gap-4">
            {PROCEEDS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="text-sm leading-relaxed text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Not */}
        <div className="rounded-md border border-edge/30 bg-card/60 p-8">
          <h3 className="font-display text-xl font-bold text-foreground">
            What this is not
          </h3>
          <ul className="mt-6 flex flex-col gap-4">
            {NOT.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-edge/40 bg-edge/10">
                  <X className="h-3 w-3 text-edge" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
