import Link from 'next/link'
import { EyeMark } from '@/components/ui/EyeMark'
import { SocialLinks } from '@/components/layout/SocialLinks'
import { ROUTES, STATUS } from '@/lib/site-config'

const FOOTER_LINKS = [
  { label: 'How it works', href: `${ROUTES.home}#how-it-works` },
  { label: 'Tokenomics', href: ROUTES.tokenomics },
  { label: 'Launch support', href: ROUTES.launchSupport },
  { label: 'Features', href: `${ROUTES.home}#features` },
  { label: 'Launch App', href: ROUTES.app },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <EyeMark className="h-7 w-7 text-primary" />
              <span className="font-display text-base font-bold tracking-tight text-foreground">
                Eyes Open
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-mono-label text-muted-foreground">
                $EYES
              </span>{' '}
              · Fair launch infrastructure
            </p>
            <p className="mt-4 font-display text-lg font-bold text-foreground text-balance">
              Eyes Open. No Snipers. No Games.
            </p>
            <SocialLinks className="mt-6" />
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-3 sm:grid-cols-1">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono-label text-muted-foreground">
            © {new Date().getFullYear()} Eyes Open
          </p>
          <p className="font-mono-label text-muted-foreground">
            {STATUS.networkDetail}
          </p>
        </div>
      </div>
    </footer>
  )
}
