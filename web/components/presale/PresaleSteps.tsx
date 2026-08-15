import { Wallet, SlidersHorizontal, PenLine } from 'lucide-react'
import { Section, Eyebrow } from '@/components/ui/Section'

const STEPS = [
  {
    icon: Wallet,
    title: 'Connect wallet',
    line: 'Link your own self-custodial wallet — no account or sign-up.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Choose amount',
    line: 'Pick how much ETH to send. You stay in full control of your funds.',
  },
  {
    icon: PenLine,
    title: 'Confirm in your wallet',
    line: 'You review and sign the on-chain transaction yourself.',
  },
]

export function PresaleSteps() {
  return (
    <Section id="how-it-works">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="mt-5 max-w-2xl font-display text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
        Three steps, fully self-custodial
      </h2>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="relative rounded-md border border-border bg-card/60 p-8"
          >
            <span className="font-mono-label text-muted-foreground">
              0{i + 1}
            </span>
            <span className="mt-5 grid h-11 w-11 place-items-center rounded-sm border border-primary/30 bg-primary/10">
              <step.icon className="h-5 w-5 text-primary" />
            </span>
            <h3 className="mt-5 font-display text-lg font-bold text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.line}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}
