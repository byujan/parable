import { NextRequest, NextResponse } from 'next/server'
import { loadSession, updateSessionStatus } from '@/lib/agent/session-store'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await loadSession(params.id)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.status !== 'running') {
    return NextResponse.json({ error: 'Session is not running' }, { status: 400 })
  }

  await updateSessionStatus(params.id, 'stopped')

  return NextResponse.json({ status: 'stopped', session_id: params.id })
}
