import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LEGAL_LAST_UPDATED } from '@/lib/legal/meta'
import type { LegalDocument } from '@/lib/legal/types'
import { LEGAL_NAV, TRUST_DOCUMENT } from '@/lib/legal'
import { ROUTES } from '@/lib/site-config'

type LegalDocumentViewProps = {
  document: LegalDocument
  className?: string
}

export function LegalDocumentView({ document, className }: LegalDocumentViewProps) {
  const isTrust = document.slug === TRUST_DOCUMENT.slug

  return (
    <article className={cn('mx-auto w-full max-w-3xl px-6 py-16 lg:px-8 lg:py-20', className)}>
      <header className="border-b border-border pb-8">
        <p className="font-mono-label text-primary">
          {isTrust ? 'Trust & legal' : 'Policies'}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {document.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{document.description}</p>
        <p className="mt-4 font-mono-label text-[0.65rem] text-muted-foreground">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        {!isTrust ? (
          <div className="mt-6 rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm leading-relaxed text-amber-200">
            <strong>Important:</strong> These documents are standard project legal templates. They
            are not a substitute for advice from a qualified attorney in your jurisdiction.
          </div>
        ) : (
          <div className="mt-6 rounded-sm border border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Live addresses &amp; status:</strong>{' '}
            <Link href={`${ROUTES.legal}#trust`} className="text-primary hover:underline">
              On-chain table on /legal
            </Link>{' '}
            is always current. This page is the full written guide.
          </div>
        )}
      </header>

      <div className="mt-10 space-y-10">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="font-display text-lg font-bold text-foreground">{section.title}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <nav className="mt-16 border-t border-border pt-8">
        <p className="font-mono-label text-muted-foreground">More</p>
        <ul className="mt-4 flex flex-col gap-2">
          <li>
            <Link href={`${ROUTES.legal}#trust`} className="text-sm text-primary hover:underline">
              Trust hub (live addresses)
            </Link>
          </li>
          {LEGAL_NAV.filter((item) => item.slug !== document.slug).map((item) => (
            <li key={item.slug}>
              <Link href={item.href} className="text-sm text-primary hover:underline">
                {item.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href={ROUTES.legal} className="text-sm text-muted-foreground hover:text-foreground">
              All trust &amp; legal
            </Link>
          </li>
        </ul>
      </nav>
    </article>
  )
}
