import Link from 'next/link'
import { cn } from '@/lib/utils'

type CtaButtonProps = {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
}

export function CtaButton({
  href,
  children,
  variant = 'primary',
  className,
}: CtaButtonProps) {
  const base =
    'group inline-flex items-center justify-center gap-2 rounded-sm border px-5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  const variants = {
    primary: cn(
      'border-primary/40 bg-primary/10 text-primary',
      'hover:bg-primary/20 hover:border-primary/70',
      'shadow-[0_0_0_1px_rgba(212,175,55,0.1),0_0_24px_-8px_rgba(212,175,55,0.6)]',
    ),
    secondary:
      'border-border bg-surface text-foreground hover:border-primary/50 hover:bg-muted',
  }

  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  )
}
