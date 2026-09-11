import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { CtaButton } from '@/components/ui/CtaButton'
import { ROUTES } from '@/lib/site-config'

/** Compact pointer from tokenomics → unified trust hub on /legal */
export function TokenomicsTrustStrip() {
  return (
    <section className="border-y border-border bg-surface/40 py-10 lg:py-12">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <p className="font-mono-label text-primary">Trust &amp; verification</p>
            <h2 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">
              Contracts, treasury &amp; policies live in one place
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              BaseScan addresses, audit status, Safe admin, and official legal docs—on{' '}
              <Link href={ROUTES.legal} className="text-primary hover:underline">
                /legal
              </Link>
              . Verify before you participate.
            </p>
          </div>
          <CtaButton href={`${ROUTES.legal}#trust`} variant="secondary">
            Verify on /legal
          </CtaButton>
        </div>
      </Container>
    </section>
  )
}
