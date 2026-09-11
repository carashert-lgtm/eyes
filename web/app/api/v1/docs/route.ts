import { NextResponse } from 'next/server'
import { getLaunchApiDocs } from '@/lib/api-v1/docs'

export async function GET() {
  return NextResponse.json({ ok: true, ...getLaunchApiDocs() })
}
