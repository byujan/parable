import { NextRequest, NextResponse } from 'next/server'
import { loadSession } from '@/lib/agent/session-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await loadSession(params.id)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(session)
}
