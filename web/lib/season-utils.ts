import { SEASON_CONFIG } from '@/lib/retention-config'

export type SeasonInfo = {
  seasonNumber: number
  startsAt: string
  endsAt: string
  daysRemaining: number
  label: string
}

export function getCurrentSeason(now = new Date()): SeasonInfo {
  const epoch = new Date(SEASON_CONFIG.epochIso).getTime()
  const msPerSeason = SEASON_CONFIG.lengthDays * 24 * 60 * 60 * 1000
  const elapsed = Math.max(0, now.getTime() - epoch)
  const seasonNumber = Math.floor(elapsed / msPerSeason) + 1
  const start = new Date(epoch + (seasonNumber - 1) * msPerSeason)
  const end = new Date(start.getTime() + msPerSeason)
  const daysRemaining = Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
  )

  return {
    seasonNumber,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    daysRemaining,
    label: `Season ${seasonNumber}`,
  }
}
