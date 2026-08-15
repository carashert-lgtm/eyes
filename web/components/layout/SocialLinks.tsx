import Link from 'next/link'
import { isSocialConfigured, SOCIAL_LINKS } from '@/lib/site-config'
import { cn } from '@/lib/utils'

const SOCIAL_ITEMS = [
  { key: 'x' as const, label: 'X', href: SOCIAL_LINKS.x },
  { key: 'telegram' as const, label: 'Telegram', href: SOCIAL_LINKS.telegram },
  { key: 'discord' as const, label: 'Discord', href: SOCIAL_LINKS.discord },
]

export function SocialLinks({ className }: { className?: string }) {
  const active = SOCIAL_ITEMS.filter((item) => isSocialConfigured(item.href))

  if (active.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        Community links — set in site config
      </p>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {active.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
