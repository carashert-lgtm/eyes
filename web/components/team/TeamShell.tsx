'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EyeMark } from '@/components/ui/EyeMark'
import { BRAND, ROUTES } from '@/lib/site-config'
import { cn } from '@/lib/utils'

const TEAM_NAV = [
  { label: 'Team Pool', href: ROUTES.teamPool },
] as const

export function TeamShell({
  children,
  username,
}: {
  children: React.ReactNode
  username?: string | null
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  async function logout() {
    await fetch('/api/team/logout', { method: 'POST' })
    window.location.href = ROUTES.teamActivate
  }

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
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6 lg:px-8">
          <Link href={ROUTES.teamPool} className="flex shrink-0 items-center gap-2.5">
            <EyeMark className="h-7 w-7 text-primary" />
            <span className="flex items-baseline gap-2">
              <span className="font-display text-base font-bold tracking-tight text-foreground">
                {BRAND.name}
              </span>
              <span className="inline-flex items-center gap-1 font-mono-label text-[0.62rem] text-primary">
                <Lock className="h-3 w-3" />
                Team Space
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {TEAM_NAV.map((link) => {
              const active = pathname.startsWith(link.href)
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
            {username ? (
              <span className="hidden rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-foreground sm:inline-flex">
                {username}
              </span>
            ) : null}
            <button
              type="button"
              onClick={logout}
              className="hidden min-h-9 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
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

        {open ? (
          <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col px-6 py-4">
              {TEAM_NAV.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-b border-border/60 py-3 text-sm text-muted-foreground last:border-0 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={logout}
                className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border bg-surface text-sm text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </nav>
          </div>
        ) : null}
      </header>
      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-8 lg:px-8 lg:pt-10">
        {children}
        <p className="border-t border-border py-6 text-center font-mono-label text-[0.58rem] leading-relaxed text-muted-foreground">
          Team-only · Not public · Not financial advice
        </p>
      </main>
    </div>
  )
}
