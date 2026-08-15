import { DiagramCard, FlowNode } from '@/components/ui/DiagramCard'

export function FeeSplitDiagram() {
  return (
    <DiagramCard
      title="Fee split"
      subtitle="Every swap on a platform launch token through EyesFeeRouter"
    >
      <div className="flex flex-col items-center gap-4">
        <FlowNode
          title="1% trading fee"
          description="Skimmed on every routed swap"
          accent="neutral"
          className="w-full max-w-xs"
        />

        <div aria-hidden className="h-8 w-px bg-border" />

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <FlowNode
            title="50% → Creator"
            description="Paid in ETH instantly on-chain"
            accent="cyan"
          />
          <FlowNode
            title="50% → Buy & burn"
            description="Queued ETH buys $EYES and burns"
            accent="rose"
          />
        </div>
      </div>
    </DiagramCard>
  )
}

export function BuyBurnLoopDiagram() {
  const steps = [
    'Trading fees accumulate',
    'Keeper executes buy & burn',
    'ETH swaps into $EYES',
    'Tokens burned on-chain',
    'Circulating supply drops',
  ]

  return (
    <DiagramCard
      title="Buy / burn loop"
      subtitle="Automated deflation tied to platform volume"
    >
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/10 font-mono text-xs text-primary">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="text-sm text-muted-foreground">{step}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-sm border border-edge/20 bg-edge/5 px-4 py-3 text-center">
        <p className="font-mono-label text-edge">
          More volume → more burns → less supply
        </p>
      </div>
    </DiagramCard>
  )
}

export function LaunchTradeBurnDiagram() {
  const steps = [
    { label: 'Launch', detail: 'Fair deploy + Eyes Window' },
    { label: 'Trade', detail: 'Swaps route through fee router' },
    { label: 'Burn', detail: '$EYES bought and destroyed' },
  ]

  return (
    <DiagramCard
      title="Launch → trade → burn"
      subtitle="Platform growth maps directly to token demand"
      className="lg:col-span-2"
    >
      <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="flex flex-1 flex-col items-center gap-4 md:flex-row"
          >
            <div className="w-full flex-1 rounded-sm border border-border bg-background px-4 py-5 text-center">
              <p className="font-display text-lg font-bold text-foreground">
                {step.label}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{step.detail}</p>
            </div>
            {index < steps.length - 1 ? (
              <span aria-hidden className="font-mono text-primary">
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </DiagramCard>
  )
}
