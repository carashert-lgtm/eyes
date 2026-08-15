'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section, Eyebrow } from '@/components/ui/Section'

const FAQS = [
  {
    q: 'Is this the same as trading fees?',
    a: 'No. The presale is a separate 14-day pre-launch growth pool for launch visibility and distribution. It is distinct from the 1% trading fee, which splits 50% to the creator and 50% to buy & burn.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. There is no sign-up, email, or password. You connect a self-custodial wallet and sign the transaction yourself — nothing is held on your behalf.',
  },
  {
    q: 'What crypto can I send?',
    a: 'Contributions are made in ETH on the network shown in the panel. During testing this is Base Sepolia; mainnet contributions open after the audit completes.',
  },
  {
    q: 'What happens after I contribute?',
    a: 'Your transaction is recorded on-chain and the funds go directly to launch growth operations — content, community, visibility, and outreach. There is no custodial balance to withdraw.',
  },
]

export function PresaleFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Section id="faq">
      <Eyebrow>FAQ</Eyebrow>
      <h2 className="mt-5 max-w-2xl font-display text-4xl font-extrabold tracking-tight text-foreground text-balance sm:text-5xl">
        Questions, answered plainly
      </h2>

      <div className="mt-12 mx-auto max-w-3xl divide-y divide-border border-y border-border">
        {FAQS.map((faq, i) => {
          const isOpen = open === i
          return (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-display text-lg font-bold text-foreground">
                  {faq.q}
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-primary transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  isOpen ? 'grid-rows-[1fr] pb-5 opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <p className="overflow-hidden text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
