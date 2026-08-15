'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_LINKS, ROUTES } from '@/lib/constants'
import { EyeMark } from '@/components/ui/EyeMark'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <EyeMark className="h-7 w-7 text-primary" />
          <span className="flex items-baseline gap-2">
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              Eyes Open
            </span>
            <span className="font-mono-label text-[0.62rem] text-muted-foreground">
              $EYES
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.app}
            className="hidden rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:border-primary/70 hover:bg-primary/20 sm:inline-flex"
          >
            Launch App
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-sm border border-border bg-surface text-foreground lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-6 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-3 text-sm text-muted-foreground transition-colors last:border-0 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={ROUTES.app}
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex justify-center rounded-sm border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary"
            >
              Launch App
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
