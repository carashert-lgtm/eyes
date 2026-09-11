/** Public launch countdown target (ISO 8601 UTC). Override via NEXT_PUBLIC_LAUNCH_END_ISO. */
export function getLaunchEndIso(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_LAUNCH_END_ISO?.trim()
  if (fromEnv) return fromEnv
  return null
}

export function getLaunchEndMs(): number | null {
  const iso = getLaunchEndIso()
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}
