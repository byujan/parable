import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET campaign logs for the event timeline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const after = request.nextUrl.searchParams.get('after')
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get('limit') || '50', 10),
    200,
  )

  let query = supabase
    .from('campaign_logs')
    .select('*')
    .eq('campaign_id', params.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (after) {
    query = query.gt('created_at', after)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data || [] })
}
