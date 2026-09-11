'use client'

type Slice = {
  label: string
  value: number
  color: string
}

const COLORS = {
  locked: '#a97f12',
  unlocked: '#d4af37',
  claimed: '#b8a88a',
  remaining: '#3d3424',
}

export function PoolPieChart({
  locked,
  unlocked,
  claimed,
  remaining,
  total,
}: {
  locked: number
  unlocked: number
  claimed: number
  remaining: number
  total: number
}) {
  const slices: Slice[] = [
    { label: 'Locked', value: locked, color: COLORS.locked },
    { label: 'Unlocked', value: unlocked, color: COLORS.unlocked },
    { label: 'Claimed', value: claimed, color: COLORS.claimed },
    { label: 'Remaining', value: remaining, color: COLORS.remaining },
  ].filter((s) => s.value > 0)

  const sum = total || slices.reduce((a, s) => a + s.value, 0) || 1
  let cumulative = 0
  const gradientParts = slices.map((s) => {
    const pct = (s.value / sum) * 100
    const start = cumulative
    cumulative += pct
    return `${s.color} ${start}% ${cumulative}%`
  })

  const bg =
    slices.length > 0
      ? `conic-gradient(${gradientParts.join(', ')})`
      : 'conic-gradient(#3d3424 0% 100%)'

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
      <div
        className="relative grid h-52 w-52 shrink-0 place-items-center rounded-full"
        style={{ background: bg }}
      >
        <div className="grid h-32 w-32 place-items-center rounded-full border border-border bg-surface text-center">
          <span className="font-mono-label text-[0.58rem] text-muted-foreground">
            Total pool
          </span>
          <span className="font-display text-lg font-bold text-foreground">
            {(sum / 1_000_000).toFixed(1)}M
          </span>
          <span className="font-mono-label text-[0.55rem] text-muted-foreground">
            $EYES
          </span>
        </div>
      </div>
      <ul className="grid w-full gap-3 sm:grid-cols-2">
        {[
          { label: 'Locked', value: locked, pct: (locked / sum) * 100, color: COLORS.locked },
          { label: 'Unlocked', value: unlocked, pct: (unlocked / sum) * 100, color: COLORS.unlocked },
          { label: 'Claimed', value: claimed, pct: (claimed / sum) * 100, color: COLORS.claimed },
          { label: 'Remaining', value: remaining, pct: (remaining / sum) * 100, color: COLORS.remaining },
        ].map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 rounded-sm border border-border bg-surface px-4 py-3"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono-label text-[0.58rem] text-muted-foreground">
                {item.label}
              </p>
              <p className="font-display text-base font-bold text-foreground">
                {item.pct.toFixed(1)}%
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {(item.value / 1_000_000).toFixed(2)}M
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
