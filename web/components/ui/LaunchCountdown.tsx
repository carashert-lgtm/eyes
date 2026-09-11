'use client'

import { useEffect, useState } from 'react'
import { LAUNCH_END_ISO } from '@/lib/constants'

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(targetMs: number): TimeLeft {
  const diff = Math.max(0, targetMs - Date.now())
  const seconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

/** Display-only launch countdown — no actions when the timer reaches zero. */
export function LaunchCountdown() {
  const targetMs = LAUNCH_END_ISO ? new Date(LAUNCH_END_ISO).getTime() : null
  const isValid = targetMs !== null && !Number.isNaN(targetMs)

  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    setMounted(true)
    if (!isValid || targetMs === null) return
    const tick = () => setTimeLeft(getTimeLeft(targetMs))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isValid, targetMs])

  const shell =
    'relative mx-auto w-full max-w-2xl rounded-sm border border-primary/25 bg-card/70 px-6 py-8 text-center shadow-lg shadow-primary/5 backdrop-blur-md sm:px-10 sm:py-10'
  const innerGlow = { boxShadow: 'inset 0 0 40px -12px rgba(212,175,55,0.35)' }

  if (!isValid) {
    return (
      <div className={shell} style={innerGlow}>
        <div className="flex items-center justify-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{ animation: 'pulse-dot 2.4s ease-in-out infinite' }}
          />
          <span className="font-mono-label text-muted-foreground">Launch window</span>
        </div>
        <p className="mt-4 font-display text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
          Timer not configured
        </p>
        <p className="mt-3 text-base text-muted-foreground">Set NEXT_PUBLIC_LAUNCH_END_ISO</p>
      </div>
    )
  }

  const ended =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0

  const units: { label: string; value: number }[] = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hrs', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ]

  return (
    <div className={shell} style={innerGlow}>
      <div className="flex items-center justify-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary"
          style={{
            animation: 'pulse-dot 2s ease-in-out infinite',
            boxShadow: '0 0 8px #d4af37',
          }}
        />
        <span className="font-mono-label text-primary">
          {ended ? 'Launch window' : 'Launch in'}
        </span>
      </div>

      <div className="mt-6 flex items-start justify-center gap-3 sm:gap-6">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-start gap-3 sm:gap-6">
            <div className="flex flex-col items-center">
              <span className="font-mono text-4xl font-semibold tabular-nums leading-none text-foreground sm:text-6xl lg:text-7xl">
                {mounted ? pad(u.value) : '--'}
              </span>
              <span className="mt-3 font-mono-label text-[0.6rem] text-muted-foreground sm:text-xs">
                {u.label}
              </span>
            </div>
            {i < units.length - 1 ? (
              <span className="font-mono text-3xl font-light leading-none text-primary/40 sm:text-6xl lg:text-7xl">
                :
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {ended ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Countdown complete — launch prep starts when we&apos;re ready.
        </p>
      ) : null}
    </div>
  )
}
