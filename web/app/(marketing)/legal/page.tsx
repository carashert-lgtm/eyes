import type { Metadata } from 'next'
import Link from 'next/link'
import { TrustVerificationPanel } from '@/components/legal/TrustVerificationPanel'
import { LEGAL_LAST_UPDATED } from '@/lib/legal/meta'
import { POLICY_DOCUMENTS, TRUST_DOCUMENT } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Trust & Legal | Eyes Open',
  description:
    'Verify $EYES and Eyes Open on Base, read security posture, and access Terms, Privacy, and Risk Disclosure.',
}

export default function LegalIndexPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 lg:px-8 lg:py-20">
      <header className="border-b border-border pb-8">
        <p className="font-mono-label text-primary">Trust &amp; legal</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Verify before you participate
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          One place for on-chain addresses, security posture, and official policies. Read the trust
          section before using /app/create or sending funds. Read Risk Disclosure before transacting.
        </p>
        <p className="mt-4 font-mono-label text-[0.65rem] text-muted-foreground">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
      </header>

      <div className="mt-12">
        <TrustVerificationPanel />
      </div>

      <section id="policies" className="scroll-mt-24 mt-16 border-t border-border pt-12">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Policies
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Terms, privacy, and risk documents for eyesopen.to, the launch platform, Discord bot, and
          Team Space.
        </p>

        <ul className="mt-8 divide-y divide-border">
          <li className="py-6">
            <Link href={`/legal/${TRUST_DOCUMENT.slug}`} className="group block">
              <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary">
                {TRUST_DOCUMENT.title} (full guide)
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{TRUST_DOCUMENT.summary}</p>
            </Link>
          </li>
          {POLICY_DOCUMENTS.map((doc) => (
            <li key={doc.slug} className="py-6">
              <Link href={`/legal/${doc.slug}`} className="group block">
                <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary">
                  {doc.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{doc.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
        Not financial, legal, or tax advice. Cryptocurrency involves substantial risk of loss.
      </p>
    </div>
  )
}
