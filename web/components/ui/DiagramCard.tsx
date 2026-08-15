import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string
  suffix?: string
  className?: string
}

export function StatCard({ label, value, suffix, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-sm border border-border bg-surface p-5',
        className,
      )}
    >
      <p className="font-mono-label text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
        {value}
      </p>
      {suffix ? <p className="mt-1 text-xs text-primary">{suffix}</p> : null}
    </div>
  )
}

type FlowNodeProps = {
  title: string
  description?: string
  accent?: 'cyan' | 'rose' | 'neutral'
  className?: string
}

const accentStyles = {
  cyan: 'border-primary/30 bg-primary/10 text-primary',
  rose: 'border-edge/30 bg-edge/5 text-edge',
  neutral: 'border-border bg-background text-foreground',
}

export function FlowNode({
  title,
  description,
  accent = 'neutral',
  className,
}: FlowNodeProps) {
  return (
    <div
      className={cn(
        'rounded-sm border px-4 py-3 text-center',
        accentStyles[accent],
        className,
      )}
    >
      <p className="font-display text-sm font-bold text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}

type DiagramCardProps = {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function DiagramCard({
  title,
  subtitle,
  children,
  className,
}: DiagramCardProps) {
  return (
    <div
      className={cn(
        'rounded-sm border border-border bg-surface p-6 lg:p-8',
        className,
      )}
    >
      <p className="font-mono-label text-primary">{title}</p>
      {subtitle ? (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </div>
  )
}
