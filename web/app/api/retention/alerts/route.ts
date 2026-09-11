import { NextResponse } from 'next/server'
import { ALERT_TYPES, EYES_STAKE_TIERS, RETENTION_ENABLED } from '@/lib/retention-config'

export async function GET() {
  if (!RETENTION_ENABLED) {
    return NextResponse.json({ ok: true, enabled: false, alerts: [] })
  }

  return NextResponse.json({
    ok: true,
    enabled: true,
    tiers: EYES_STAKE_TIERS.map((t) => ({
      id: t.id,
      name: t.name,
      minEyes: t.minEyes,
    })),
    alerts: ALERT_TYPES.map((a) => ({
      id: a.id,
      label: a.label,
      minTier: a.minTier,
    })),
    delivery: 'In-app feed live at /app — tier-gated early access on Utility and Launches',
  })
}
