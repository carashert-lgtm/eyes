import { NextResponse } from 'next/server'
import { getCurrentSeason } from '@/lib/season-utils'
import { RETENTION_ENABLED, SEASON_CONFIG } from '@/lib/retention-config'

export async function GET() {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false })
  }

  const season = getCurrentSeason()
  return NextResponse.json({
    ok: true,
    enabled: true,
    season,
    pointWeights: SEASON_CONFIG.pointWeights,
    maxPointsPerDay: SEASON_CONFIG.maxPointsPerDay,
  })
}
