import Link from 'next/link'
import { ArrowRight, Plus, Rocket, Search } from 'lucide-react'
import { DashboardStats } from '@/components/app/DashboardStats'
import { WiringBadge } from '@/components/app/AppShell'
import { CtaButton } from '@/components/ui/CtaButton'
import { LAUNCH_SUPPORT, ROUTES, TOKENOMICS } from '@/lib/site-config'
import { cn } from '@/lib/utils'

function ActionCard({
  title,
  description,
  href,
  cta,
  icon: Icon,
  primary = false,
}: {
  title: string
  description: string
  href: string
  cta: string
  icon: typeof Rocket
  primary?: boolean
}) {
  return (
    <div className="flex flex-col rounded-sm border border-border bg-surface p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-primary/30 bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Link
        href={href}
        className={cn(
          'mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-4 py-2.5 text-sm font-medium transition-all',
          primary
            ? 'border-primary/40 bg-primary/10 text-primary hover:border-primary/70 hover:bg-primary/20'
            : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted',
        )}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export function DashboardHome() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Launch pad</span>
          <WiringBadge />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Fair launches, enforced on-chain.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Eyes Window gating, permanently locked liquidity, and{' '}
          {TOKENOMICS.feeSplit.toLowerCase()} on every trade.
        </p>
      </div>

      <DashboardStats />

      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard
          title="Create a launch"
          description="Deploy a fair launch with Eyes Window protection and permanent LP lock."
          href={ROUTES.appCreate}
          cta="Create Launch"
          icon={Plus}
          primary
        />
        <ActionCard
          title="Browse launches"
          description="Discover active and completed launches on Eyes Open testnet."
          href={ROUTES.appLaunches}
          cta="View launches"
          icon={Search}
        />
      </div>

      <div className="rounded-sm border border-border bg-surface p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="font-mono-label text-primary">
              {LAUNCH_SUPPORT.windowDays}-day launch support window
            </p>
            <h2 className="mt-2 font-display text-xl font-bold text-foreground">
              Bootstrap launch visibility
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Community contributions fund operational launch readiness — content,
              channels, and outreach. Separate from on-chain trading-fee tokenomics.
            </p>
          </div>
          <CtaButton href={ROUTES.appSupport} className="shrink-0">
            Contribute to launch growth
          </CtaButton>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            Recent launches
          </h2>
          <Link
            href={ROUTES.appLaunches}
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="rounded-sm border border-dashed border-border bg-surface/60 px-6 py-14 text-center">
          <Rocket className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-4 font-display text-lg font-bold text-foreground">
            No launches yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Be the first to launch fair on Eyes Open.
          </p>
          <div className="mt-6">
            <CtaButton href={ROUTES.appCreate}>Create Launch</CtaButton>
          </div>
        </div>
      </div>
    </div>
  )
}
