import { NextResponse } from 'next/server'
import { getLaunchChain } from '@/lib/launch-chains/registry'
import { preflightSolanaLaunchAsync } from '@/lib/solana-launch-preflight'

export async function GET() {
  const chain = getLaunchChain('solana')
  const result = await preflightSolanaLaunchAsync(chain)
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
