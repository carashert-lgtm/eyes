import { NextResponse } from 'next/server'

/** Email updates use the Eyes wallet account — no separate OAuth login. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    method: 'eyes-account',
  })
}
