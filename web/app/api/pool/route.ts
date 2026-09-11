import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Team pool data is available in Team Space only. Visit /team/activate.' },
    { status: 403 },
  )
}
