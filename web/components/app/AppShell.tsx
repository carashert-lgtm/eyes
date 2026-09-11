'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EyeMark } from '@/components/ui/EyeMark'
import { APP_NAV_LINKS, BRAND, ROUTES, STATUS } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import { useAppWallet } from '@/hooks/useAppWallet'
function SignInChip({ className }: { className?: string }) {
  const { signedIn, isConnected, accountEmail, walletUnlocked } = useAppWallet()

  if (!signedIn) {
    return (
      <Link
        href={ROUTES.appProfile}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:border-primary/70 hover:bg-primary/20',
          className,
        )}
      >
        <User className="h-4 w-4" />
        Sign in
      </Link>
    )
  }

  return (
    <Link
      href={ROUTES.appProfile}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50',
        className,
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          isConnected ? 'bg-primary' : signedIn && !walletUnlocked ? 'bg-amber-500' : 'bg-primary',
        )}
      />
      {isConnected
        ? 'Eyes Wallet'
        : signedIn && !walletUnlocked
          ? 'Unlock wallet'
          : signedIn
            ? 'Eyes Wallet'
            : accountEmail ?? 'Account'}
    </Link>
  )
}

export function AppTopBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6 lg:px-8">
        <Link href={ROUTES.app} className="flex shrink-0 items-center gap-2.5">
          <EyeMark className="h-7 w-7 text-primary" />
          <span className="flex items-baseline gap-2">
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              {BRAND.name}
            </span>
            <span className="font-mono-label text-[0.62rem] text-muted-foreground">
              {BRAND.ticker}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {APP_NAV_LINKS.map((link) => {
            const active =
              link.href === ROUTES.app
                ? pathname === ROUTES.app
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-sm px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <SignInChip className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-9 w-9 place-items-center rounded-sm border border-border bg-surface text-foreground lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-6 py-4">
            {APP_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-b border-border/60 py-3 text-sm text-muted-foreground last:border-0 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4">
              <SignInChip className="w-full justify-center" />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export function AppDisclaimer() {
  return (
    <p className="border-t border-border py-6 text-center font-mono-label text-[0.58rem] leading-relaxed text-muted-foreground">
      {STATUS.disclaimer} only · Not financial advice ·{' '}
      <a href="/legal#trust" className="text-primary hover:underline">
        Verify contracts
      </a>{' '}
      ·{' '}
      <a href="/legal/risk-disclosure" className="text-primary hover:underline">
        Risk disclosure
      </a>
    </p>
  )
}

export function WiringBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-sm border border-edge/30 bg-edge/5 px-2.5 py-1 font-mono-label text-[0.58rem] text-edge',
        className,
      )}
    >
      {STATUS.wiringBadge}
    </span>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-grid opacity-30 mask-fade-b"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-scan"
      />
      <AppTopBar />
      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-8 lg:px-8 lg:pt-10">
        {children}
        <AppDisclaimer />
      </main>
    </div>
  )
}
