const CURRENT_DAY = 3
const TOTAL_DAYS = 14
const PROGRESS = (CURRENT_DAY / TOTAL_DAYS) * 100

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono-label text-muted-foreground">{label}</span>
      <span className="font-display text-2xl font-bold tracking-tight text-foreground">
        {value}
      </span>
    </div>
  )
}

export function StatusStrip() {
  return (
    <section className="border-y border-border bg-surface/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:flex lg:gap-12">
            <Stat label="Raised" value="— ETH" />
            <Stat label="Contributors" value="—" />
            <Stat label="Presale ends in" value="11d 4h" />
            <div className="flex flex-col justify-center gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono-label text-primary">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  style={{
                    animation: 'pulse-dot 2s ease-in-out infinite',
                    boxShadow: '0 0 8px #d4af37',
                  }}
                />
                Base Sepolia · Testnet
              </span>
            </div>
          </div>

          {/* Window progress */}
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono-label text-muted-foreground">Window</span>
              <span className="font-mono-label text-foreground">
                Day {CURRENT_DAY} of {TOTAL_DAYS}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${PROGRESS}%`,
                  boxShadow: '0 0 12px -2px #d4af37',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
