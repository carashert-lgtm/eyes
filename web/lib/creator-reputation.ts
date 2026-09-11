import type { LaunchesSnapshot } from '@/lib/launch-types'
import { countBoostsByWallet } from '@/lib/retention-store'
import type { CreatorReputation } from '@/lib/retention-types'

function reputationLabel(score: number): string {
  if (score >= 85) return 'Legend'
  if (score >= 70) return 'Established'
  if (score >= 50) return 'Rising'
  if (score >= 25) return 'New'
  return 'Unranked'
}

export async function computeCreatorReputation(
  wallet: string,
  snapshot: LaunchesSnapshot,
): Promise<CreatorReputation> {
  const w = wallet.toLowerCase()
  const mine = snapshot.launches.filter((l) => l.creator.toLowerCase() === w)
  const launches = mine.length
  const volumeUsd24h = mine.reduce((s, l) => s + l.volumeUsd24h, 0)
  const eyesBurned = mine.reduce((s, l) => s + l.eyesBurnedTotal, 0)
  const boostsPurchased = await countBoostsByWallet(wallet)

  const launchScore = Math.min(launches * 20, 40)
  const volumeScore = Math.min(volumeUsd24h / 10_000, 30)
  const burnScore = Math.min(eyesBurned / 50_000, 20)
  const boostScore = Math.min(boostsPurchased * 5, 10)
  const score = Math.round(Math.min(100, launchScore + volumeScore + burnScore + boostScore))

  return {
    score,
    label: reputationLabel(score),
    launches,
    volumeUsd24h,
    eyesBurned,
    boostsPurchased,
  }
}
