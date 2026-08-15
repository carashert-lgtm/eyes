import { cn } from '@/lib/utils'

export function Section({
  id,
  className,
  children,
  divider = true,
}: {
  id?: string
  className?: string
  children: React.ReactNode
  divider?: boolean
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-20 py-24 lg:py-32',
        divider && 'border-t border-border',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">{children}</div>
    </section>
  )
}

export function Eyebrow({
  children,
  tone = 'cyan',
}: {
  children: React.ReactNode
  tone?: 'cyan' | 'rose'
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          tone === 'cyan' ? 'bg-primary' : 'bg-edge',
        )}
        style={{
          boxShadow:
            tone === 'cyan' ? '0 0 8px #d4af37' : '0 0 8px #b45309',
        }}
      />
      <span
        className={cn(
          'font-mono-label',
          tone === 'cyan' ? 'text-primary' : 'text-edge',
        )}
      >
        {children}
      </span>
    </div>
  )
}
