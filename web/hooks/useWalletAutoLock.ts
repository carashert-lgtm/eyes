'use client'

import { useEffect, useRef } from 'react'
import type { WalletAutoLockMinutes } from '@/lib/settings/types'

const EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

export function useWalletAutoLock(
  enabled: boolean,
  minutes: WalletAutoLockMinutes,
  onLock: () => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || minutes <= 0) return

    const ms = minutes * 60 * 1000
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(onLock, ms)
    }

    reset()
    for (const ev of EVENTS) {
      window.addEventListener(ev, reset, { passive: true })
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') reset()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      for (const ev of EVENTS) {
        window.removeEventListener(ev, reset)
      }
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [enabled, minutes, onLock])
}
